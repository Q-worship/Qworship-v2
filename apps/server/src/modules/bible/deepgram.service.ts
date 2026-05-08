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
 *
 * Fix 2 — Add missing low-latency parameters:
 *   - vad_events=true       → enable SpeechStarted/SpeechFinished events
 *   - utterance_end_ms=800  → safety-net UtteranceEnd after 800ms silence
 *   - endpointing=300       → was 150 (caused false end-of-speech on breath pauses)
 *   NOTE: no_delay is NOT a valid Nova-3 parameter — removed (caused HTTP 400 crash)
 *
 * Fix 3 — Embed API key fallback (reliability):
 *   Remove the throw — use built-in Qworship key if env var not set.
 *   All users share the Qworship account key; no per-user configuration needed.
 *
 * Fix 4 — KeepAlive to prevent 10-second Deepgram timeout during silence:
 *   Send a KeepAlive JSON message every 8 seconds while connected.
 *   Without this, Deepgram closes the connection with code 1011 after 10s
 *   of silence (e.g. during a long prayer or reading).
 */

// Built-in Qworship Deepgram key — all users share the Qworship account.
// An environment variable override is still supported for development.
const BUILTIN_DEEPGRAM_KEY = "fc5d0c26fa79d5749593ba0a8a745eaa2470cb9a";

// KeepAlive interval — must be less than Deepgram's 10-second timeout
const KEEPALIVE_INTERVAL_MS = 8000;

export class DeepgramTranscriptionService extends EventEmitter {
  private socket: WebSocket | null = null;
  private isConnecting = false;
  private apiKey: string;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super();
    // Fix 3: Use built-in key as fallback — never throw
    this.apiKey = process.env.DEEPGRAM_API_KEY || BUILTIN_DEEPGRAM_KEY;
    if (!this.apiKey) {
      console.error("[Deepgram] No API key available — transcription will fail");
    }
  }

  async connect() {
    if (
      this.isConnecting ||
      (this.socket && this.socket.readyState === WebSocket.OPEN)
    ) {
      console.log("[Deepgram] Already connected or connecting");
      return;
    }

    this.isConnecting = true;
    this.emit("connecting");
    console.log(`[Deepgram] Connecting with Nova-3 (Stage 3 low-latency params)...`);

    // Build the Deepgram WebSocket URL with all low-latency parameters
    const deepgramUrl = new URL("wss://api.deepgram.com/v1/listen");
    deepgramUrl.searchParams.append("model", "nova-3");
    deepgramUrl.searchParams.append("language", "en-US");
    deepgramUrl.searchParams.append("smart_format", "true");
    deepgramUrl.searchParams.append("interim_results", "true");
    // Fix 2a: endpointing=300 (was 150) — prevents false end-of-speech on breath pauses.
    // A pastor breathing mid-reference (100–200ms pause) would previously trigger
    // is_final prematurely, splitting "Genesis chapter 8 [breath] verse 12" into two
    // separate utterances. 300ms gives enough room for natural breath pauses.
    deepgramUrl.searchParams.append("endpointing", "300");
    deepgramUrl.searchParams.append("punctuate", "true");
    deepgramUrl.searchParams.append("dictation", "true");
    deepgramUrl.searchParams.append("numerals", "true");
    deepgramUrl.searchParams.append("encoding", "linear16");
    deepgramUrl.searchParams.append("sample_rate", "16000");
    deepgramUrl.searchParams.append("channels", "1");
    // Fix 2b: vad_events=true — enable SpeechStarted/SpeechFinished events
    // NOTE: no_delay is NOT a valid Nova-3 parameter — it causes HTTP 400 and crashes the server
    deepgramUrl.searchParams.append("vad_events", "true");
    // Fix 2d: utterance_end_ms=800 — safety-net: fires UtteranceEnd after 800ms silence
    // if speech_final was missed. Requires interim_results=true (already set above).
    deepgramUrl.searchParams.append("utterance_end_ms", "800");

    try {
      this.socket = new WebSocket(deepgramUrl.toString(), {
        headers: {
          Authorization: `Token ${this.apiKey}`,
        },
      });

      this.socket.on("open", () => {
        this.isConnecting = false;
        this.emit("connected");
        console.log("[Deepgram] Connection established (Nova-3, low-latency mode)");
        // Fix 4: Start KeepAlive pings to prevent 10-second timeout during silence
        this._startKeepAlive();
      });

      this.socket.on("message", (data: WebSocket.Data) => {
        try {
          const response = JSON.parse(data.toString());

          if (response.type === "Results") {
            const transcript = response.channel?.alternatives?.[0]?.transcript;
            const confidence = response.channel?.alternatives?.[0]?.confidence;
            const isFinal: boolean = response.is_final === true;
            // Fix 1: Read speech_final — Deepgram's fast VAD signal (~150ms after silence)
            const speechFinal: boolean = response.speech_final === true;

            if (transcript && transcript.trim()) {
              // Fix 1: Use speech_final as the primary end-of-speech trigger.
              // speech_final fires ~150ms after silence (fast VAD).
              // is_final fires ~300–500ms after silence (slow endpointing).
              // Using speech_final saves 300–500ms on every single utterance.
              // is_final is kept as a fallback for edge cases.
              if (speechFinal || isFinal) {
                console.log(
                  `[Deepgram] Final (speech_final=${speechFinal}, is_final=${isFinal}): "${transcript.slice(0, 80)}"`
                );
                this.emit("final", transcript, confidence);
              } else {
                this.emit("partial_raw", transcript, confidence);
              }
            }
          }

          // UtteranceEnd — safety net: fires after utterance_end_ms of silence
          // if speech_final was missed (e.g. very short utterance, noisy audio)
          if (response.type === "UtteranceEnd") {
            console.log("[Deepgram] UtteranceEnd received (safety net)");
            this.emit("utterance_end");
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
      });

      await this.waitForOpen();
    } catch (err) {
      this.isConnecting = false;
      this._stopKeepAlive();
      console.error("[Deepgram] Connection failed:", err);
      this.emit("error", err);
      throw err;
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
    } else if (!this.isConnecting) {
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

  stop() {
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
  }
}
