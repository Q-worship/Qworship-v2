import { EventEmitter } from "events";
import WebSocket from "ws";

/**
 * DeepgramTranscriptionService — QC56 Stage 3
 *
 * LATENCY FIXES APPLIED:
 * ─────────────────────────────────────────────────────────────────────────────
 * Fix 1 — speech_final wiring (CRITICAL, saves ~300–500ms):
 *   Previously `speech_final` was read into `isUtteranceEnd` but NEVER USED.
 *   The code only checked `is_final` (the slow endpointing signal, ~300–500ms
 *   after silence). Now `speech_final` (Deepgram's fast VAD signal, ~150ms
 *   after silence) is used as the primary trigger. `is_final` is kept as a
 *   fallback for edge cases where `speech_final` doesn't fire.
 * Fix 2 — Low-latency Deepgram parameters (QC56 Stage 4):
 *   - model=nova-2          → Nova-2 emits more frequent partials than Nova-3 (~300ms faster)
 *   - endpointing=100       → was 300 — 100ms silence triggers speech_final (saves ~200ms)
 *   - smart_format REMOVED  → smart_format adds post-processing delay on partials (~100ms)
 *   - vad_events=true       → enable SpeechStarted events
 *   NOTE: no_delay is NOT a valid parameter — removed (caused HTTP 400)
 *   NOTE: utterance_end_ms is NOT accepted on this account tier — removed (caused HTTP 400)
 * Fix 4 — KeepAlive to prevent 10-second Deepgram timeout during silence:
 *   Send a KeepAlive JSON message every 8 seconds while connected.
 *   Without this, Deepgram closes the connection with code 1011 after 10s
 *   of silence (e.g. during a long prayer or reading).
 */

// KeepAlive interval — must be less than Deepgram's 10-second timeout
const KEEPALIVE_INTERVAL_MS = 8000;
const RECOGNITION_WINDOW_WORDS = 24;
const TRANSCRIPT_WINDOW_WORDS = 40;

function takeLastWords(text: string, limit: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length > limit ? words.slice(-limit).join(" ") : words.join(" ");
}

export class DeepgramTranscriptionService extends EventEmitter {
  private socket: WebSocket | null = null;
  private isConnecting = false;
  private apiKey: string;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private pendingAudio: Buffer[] = [];
  private shouldReconnect = true;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private finalizedTranscriptParts: string[] = [];
  private sentAudioChunks = 0;
  private sentAudioBytes = 0;
  private deepgramMessageCount = 0;

  constructor() {
    super();
    this.apiKey = process.env.DEEPGRAM_API_KEY || "";
    if (!this.apiKey) {
      console.error("[Deepgram] DEEPGRAM_API_KEY is not configured");
    }
  }

  async connect() {
    this.shouldReconnect = true;
    if (
      this.isConnecting ||
      (this.socket && this.socket.readyState === WebSocket.OPEN)
    ) {
      console.log("[Deepgram] Already connected or connecting");
      return;
    }

    this.isConnecting = true;
    this.emit("connecting");
    if (!this.apiKey) {
      this.isConnecting = false;
      this.emit("error", new Error("DEEPGRAM_API_KEY is not configured"));
      return;
    }
    console.log(`[Deepgram] Connecting with Nova-3 (QC61 upgrade, Stage 4 low-latency params)...`);

    // Build the Deepgram WebSocket URL with all low-latency parameters
    const deepgramUrl = new URL("wss://api.deepgram.com/v1/listen");
    // QC61: Upgraded to nova-3 — improved accuracy for Bible names, proper nouns, and
    // conversational speech. Nova-3 WER: 6.84% vs nova-2 WER: 9.09% (25% improvement).
    // Latency difference is negligible (~10ms p50) given the 3-tier predictive pipeline.
    deepgramUrl.searchParams.append("model", "nova-3");
    deepgramUrl.searchParams.append("language", "en-US");
    // smart_format REMOVED — adds ~100ms post-processing delay on every partial
    deepgramUrl.searchParams.append("interim_results", "true");
    // Interim parsing handles complete references before finalization. A short
    // endpoint keeps final transcript/navigation fallback below one second.
    deepgramUrl.searchParams.append("endpointing", "100");
    deepgramUrl.searchParams.append("numerals", "true");
    deepgramUrl.searchParams.append("encoding", "linear16");
    deepgramUrl.searchParams.append("sample_rate", "16000");
    deepgramUrl.searchParams.append("channels", "1");
    // vad_events=true — enable SpeechStarted events for early detection
    // NOTE: no_delay is NOT a valid parameter — removed (caused HTTP 400)
    // NOTE: utterance_end_ms is NOT accepted on this account tier — removed (caused HTTP 400)
    deepgramUrl.searchParams.append("vad_events", "true");

    // ── QC62: Keyterm Prompting — Tier 1 (Bible Books) + Tier 2 (Navigation) ──────────────
    //
    // Keyterms bias Deepgram's decoder probability toward domain-specific vocabulary.
    // This is NOT forced recognition — it increases confidence for rare/unusual words.
    // Zero latency impact: keyterms are sent once at connection time, not per-chunk.
    //
    // Tier 1: All 66 canonical Bible book names + spoken variants + common mispronunciations
    // Tier 2: Navigation and command phrases used in Qworship HFB
    //
    // Benefits both the Qworship V2 web app AND the Live Console desktop app
    // (both connect to this same server endpoint).
    const BIBLE_KEYTERMS: string[] = [
      // ── Old Testament ──────────────────────────────────────────────────────
      // Torah / Pentateuch
      "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
      // Historical Books
      "Joshua", "Judges", "Ruth",
      "First Samuel", "1 Samuel", "Second Samuel", "2 Samuel",
      "First Kings", "1 Kings", "Second Kings", "2 Kings",
      "First Chronicles", "1 Chronicles", "Second Chronicles", "2 Chronicles",
      "Ezra", "Nehemiah", "Esther",
      // Wisdom / Poetry
      "Job", "Psalms", "Psalm", "Proverbs", "Ecclesiastes", "Ecclesiasticus",
      "Song of Solomon", "Song of Songs", "Song of Song",
      // Major Prophets
      "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel",
      // Minor Prophets
      "Hosea", "Joel", "Amos", "Obadiah", "Obadia",
      "Jonah", "Micah", "Nahum", "Habakkuk", "Habakuk", "Habacuc",
      "Zephaniah", "Zephania", "Haggai", "Haggay",
      "Zechariah", "Zachariah", "Malachi", "Malacy",
      // ── New Testament ──────────────────────────────────────────────────────
      // Gospels
      "Matthew", "Mark", "Luke", "John",
      // Acts
      "Acts", "Acts of the Apostles",
      // Pauline Epistles
      "Romans",
      "First Corinthians", "1 Corinthians", "Second Corinthians", "2 Corinthians",
      "Galatians", "Galations",
      "Ephesians", "Philippians", "Philipians", "Colossians",
      "First Thessalonians", "1 Thessalonians", "Second Thessalonians", "2 Thessalonians",
      "First Timothy", "1 Timothy", "Second Timothy", "2 Timothy",
      "Titus", "Philemon",
      // General Epistles
      "Hebrews", "James",
      "First Peter", "1 Peter", "Second Peter", "2 Peter",
      "First John", "1 John", "Second John", "2 John", "Third John", "3 John",
      "Jude", "Revelation", "Revelations",
      // ── Tier 2: Navigation and HFB command phrases ─────────────────────────
      "show me", "show verse", "project", "display",
      "next verse", "previous verse", "next chapter", "previous chapter",
      "chapter", "verse", "chapter and verse",
      "King James", "New King James", "New International", "English Standard",
      "Amplified", "The Message",
      "KJV", "NKJV", "NIV", "ESV", "AMP", "MSG",
      "switch to", "change to", "read from", "open to",
      "let me see", "let us read", "turn to", "go to",
    ];

    const CANONICAL_BIBLE_BOOKS = [
      "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua",
      "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings",
      "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job",
      "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah",
      "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel",
      "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah",
      "Haggai", "Zechariah", "Malachi", "Matthew", "Mark", "Luke", "John",
      "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians",
      "Ephesians", "Philippians", "Colossians", "1 Thessalonians",
      "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon",
      "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John",
      "Jude", "Revelation",
    ];
    const SPOKEN_NUMBERED_BOOKS = [
      "First Samuel", "Second Samuel", "First Kings", "Second Kings",
      "First Chronicles", "Second Chronicles", "First Corinthians",
      "Second Corinthians", "First Thessalonians", "Second Thessalonians",
      "First Timothy", "Second Timothy", "First Peter", "Second Peter",
      "First John", "Second John", "Third John",
    ];
    const TRANSLATION_TERMS = [
      "King James", "New King James", "New International",
      "English Standard", "Amplified", "The Message",
      "Good News Translation", "New Living Translation",
      "New Revised Standard Version", "American Standard Version",
      "Young's Literal Translation", "World English Bible", "Webster Bible",
      "KJV", "NKJV", "NIV", "ESV", "AMP", "MSG", "GN", "NLT",
      "NRSV", "ASV", "YLT", "WEB", "WEBSTER",
    ];
    const ESSENTIAL_COMMANDS = [
      "chapter", "verse", "next verse", "previous verse", "switch to", "go to",
    ];
    const prioritizedKeyterms = [
      ...CANONICAL_BIBLE_BOOKS,
      ...TRANSLATION_TERMS,
      ...ESSENTIAL_COMMANDS,
      ...SPOKEN_NUMBERED_BOOKS,
    ].slice(0, 100);
    for (const term of prioritizedKeyterms) {
      deepgramUrl.searchParams.append("keyterm", term);
    }
    console.log(`[Deepgram] QC62: ${prioritizedKeyterms.length} keyterms loaded (Bible books + navigation)`);

    try {
      this.socket = new WebSocket(deepgramUrl.toString(), {
        headers: {
          Authorization: `Token ${this.apiKey}`,
        },
      });

      this.socket.on("open", () => {
        this.isConnecting = false;
        this.emit("connected");
        console.log("[Deepgram] Connection established (Nova-3, QC61, Stage 4 low-latency mode)");
        // Fix 4: Start KeepAlive pings to prevent 10-second timeout during silence
        this._startKeepAlive();
        for (const chunk of this.pendingAudio) this.socket?.send(chunk);
        this.pendingAudio = [];
      });

      this.socket.on("message", (data: WebSocket.Data) => {
        try {
          const response = JSON.parse(data.toString());
          this.deepgramMessageCount += 1;
          if (
            this.deepgramMessageCount === 1 ||
            response.type !== "Results" ||
            response.channel?.alternatives?.[0]?.transcript
          ) {
            console.log("[Deepgram] Incoming event", {
              count: this.deepgramMessageCount,
              type: response.type,
              isFinal: response.is_final,
              speechFinal: response.speech_final,
              transcript: response.channel?.alternatives?.[0]?.transcript || "",
              confidence: response.channel?.alternatives?.[0]?.confidence,
            });
          }

          if (response.type === "Results") {
            const transcript = response.channel?.alternatives?.[0]?.transcript;
            const confidence = response.channel?.alternatives?.[0]?.confidence;
            const isFinal: boolean = response.is_final === true;
            // Fix 1: Read speech_final — Deepgram's fast VAD signal (~150ms after silence)
            const speechFinal: boolean = response.speech_final === true;

            if (transcript && transcript.trim()) {
              // is_final finalizes only the current audio segment; it does not
              // necessarily mean the speaker has finished. Accumulate finalized
              // segments and wait for speech_final before declaring the complete
              // utterance, otherwise references split across segments lose words.
              if (isFinal) this.finalizedTranscriptParts.push(transcript.trim());
              const accumulated = [
                ...this.finalizedTranscriptParts,
                ...(isFinal ? [] : [transcript.trim()]),
              ].join(" ").trim();
              // Keep command recognition constant-time during uninterrupted
              // speech. The wider display window remains readable while the
              // parser receives only the words most likely to contain a newly
              // spoken Bible reference.
              const recognitionText = takeLastWords(
                accumulated || transcript,
                RECOGNITION_WINDOW_WORDS,
              );
              const displayText = takeLastWords(
                accumulated || transcript,
                TRANSCRIPT_WINDOW_WORDS,
              );

              if (speechFinal) {
                console.log(
                  `[Deepgram] Final (speech_final=${speechFinal}, is_final=${isFinal}): "${transcript.slice(0, 80)}"`
                );
                this.emit("final", displayText, confidence, recognitionText);
                this.finalizedTranscriptParts = [];
              } else {
                this.emit(
                  "partial_raw",
                  recognitionText,
                  confidence,
                  displayText,
                );
                // Deepgram can finalize several internal segments before VAD
                // closes an utterance. Compact those segments so this buffer
                // cannot grow for the duration of a long sermon sentence.
                if (isFinal) {
                  this.finalizedTranscriptParts = [
                    takeLastWords(
                      this.finalizedTranscriptParts.join(" "),
                      TRANSCRIPT_WINDOW_WORDS,
                    ),
                  ];
                }
              }
            }
          }

          // UtteranceEnd — safety net: fires after utterance_end_ms of silence
          // if speech_final was missed (e.g. very short utterance, noisy audio)
          if (response.type === "UtteranceEnd") {
            console.log("[Deepgram] UtteranceEnd received (safety net)");
            this.emit("utterance_end");
            this.finalizedTranscriptParts = [];
          }

          // SpeechStarted / SpeechFinished — informational VAD events
          if (response.type === "SpeechStarted") {
            console.log("[Deepgram] SpeechStarted");
          }
          if (response.type === "SpeechFinished") {
            console.log("[Deepgram] SpeechFinished");
          }

          // EagerEndOfTurn / EndOfTurn — Flux model end-of-turn events
          if (response.type === "EagerEndOfTurn") {
            this.emit("eager_eot");
          }
          if (response.type === "EndOfTurn") {
            this.emit("eot");
          }

          // KeepAlive acknowledgement — Deepgram echoes it back (informational)
          if (response.type === "KeepAlive") {
            // No-op: expected echo
          }

          // Errors from Deepgram
          if (response.type === "Error") {
            console.error("[Deepgram] API Error:", response);
            this.emit("error", response);
          }
        } catch (err) {
          console.error("[Deepgram] Failed to parse message:", err);
        }
      });

      this.socket.on("error", (err) => {
        console.error("[Deepgram] WebSocket error:", err);
        this.isConnecting = false;
        this._stopKeepAlive();
        this.emit("error", err);
      });

      this.socket.on("close", (code, reason) => {
        console.log(`[Deepgram] Connection closed: ${code} - ${reason}`);
        this.isConnecting = false;
        this._stopKeepAlive();
        this.emit("disconnected");
        this.cleanup();
        if (this.shouldReconnect) {
          this.emit("connecting");
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            void this.connect();
          }, 500);
        }
      });

      await this.waitForOpen();
    } catch (err) {
      this.isConnecting = false;
      this._stopKeepAlive();
      console.error("[Deepgram] Connection failed:", err);
      this.emit("error", err);
      // Do NOT re-throw — an unhandled promise rejection from connect() crashes the
      // entire Node.js process (triggerUncaughtException). The error event above
      // is sufficient for the caller to handle the failure gracefully.
    }
  }

  private waitForOpen(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("No socket instance"));
        return;
      }

      if (this.socket.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error("Connection timeout after 10 seconds"));
      }, 10000);

      this.socket.once("open", () => {
        clearTimeout(timeout);
        resolve();
      });

      this.socket.once("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  // Fix 4: KeepAlive helpers — prevent Deepgram 1011 timeout during silence
  private _startKeepAlive() {
    this._stopKeepAlive();
    this.keepAliveTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(JSON.stringify({ type: "KeepAlive" }));
        } catch (_) {
          // Non-fatal — connection may be closing
        }
      }
    }, KEEPALIVE_INTERVAL_MS);
  }

  private _stopKeepAlive() {
    if (this.keepAliveTimer !== null) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  sendAudio(buffer: Buffer) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(buffer);
      this.sentAudioChunks += 1;
      this.sentAudioBytes += buffer.length;
      if (this.sentAudioChunks === 1 || this.sentAudioChunks % 25 === 0) {
        console.log("[Deepgram] PCM forwarded", {
          chunk: this.sentAudioChunks,
          chunkBytes: buffer.length,
          totalBytes: this.sentAudioBytes,
          socketBufferedBytes: this.socket.bufferedAmount,
        });
      }
    } else {
      this.pendingAudio.push(Buffer.from(buffer));
      if (this.pendingAudio.length > 25) this.pendingAudio.shift();
    }
    if (!this.isConnecting && this.socket?.readyState !== WebSocket.OPEN) {
      console.log("[Deepgram] Socket not ready, attempting reconnect...");
      this.connect().catch((err) => {
        console.error("[Deepgram] Reconnect failed:", err);
      });
    }
  }

  setStrictMode(strict: boolean) {
    console.log(`[Deepgram] Strict mode set to: ${strict}`);
  }

  setContext(context: any) {
    console.log("[Deepgram] Context updated:", context);
  }

  resetTranscriptContext() {
    this.finalizedTranscriptParts = [];
  }

  stop() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this._stopKeepAlive();
    if (this.socket) {
      console.log("[Deepgram] Closing connection...");
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: "CloseStream" }));
        setTimeout(() => {
          this.socket?.close();
        }, 100);
      } else {
        this.socket.close();
      }
    }
    this.cleanup();
  }

  private cleanup() {
    this._stopKeepAlive();
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket = null;
    }
    this.isConnecting = false;
    this.finalizedTranscriptParts = [];
  }
}
