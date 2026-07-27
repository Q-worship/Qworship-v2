import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { DeepgramTranscriptionService } from "./deepgram.service.js";
import { BibleService } from "./bible.service.js";
import { FastBibleParser } from "./fast-bible-parser.js";

/**
 * setupAudioSocket — QC56 Stage 3
 *
 * CHANGES FROM STAGE 2:
 * ─────────────────────────────────────────────────────────────────────────────
 * Fix 5 — Reference-keyed dedup with 5-second window (non-stop speaker fix):
 *
 *   PROBLEM: The Stage 2 dedup window was only 800ms. For a non-stop speaker
 *   who says "Genesis chapter 8 verse 12" and keeps talking, the predictive
 *   accumulator correctly projects the verse at ~800ms. But when speech_final
 *   eventually fires (potentially 5–10 seconds later, when the pastor finally
 *   pauses), the 800ms dedup window has expired and the same verse gets
 *   projected a SECOND TIME — interrupting the flow.
 *
 *   FIX: The dedup window is extended to 5000ms AND the dedup key is now
 *   based on the REFERENCE (book+chapter+verse) rather than the full command
 *   JSON. This means:
 *   - If the exact same verse was projected within the last 5 seconds, skip it
 *   - Different verses are never blocked (e.g. John 3:16 then John 3:17)
 *   - The 5-second window covers even the longest continuous speech segments
 *
 * PREDICTIVE ACCUMULATOR (unchanged from Stage 2):
 * ─────────────────────────────────────────────────────────────────────────────
 * A stateful PartialReferenceState accumulator tracks the progressive assembly
 * of a Bible reference across multiple Deepgram partial events:
 *
 *   t=0ms    partial: "On my way to church"
 *            → scan: no book found → skip
 *
 *   t=800ms  partial: "...as written in Matthew"
 *            → scan: book=Matthew detected → state.book set, waiting for chapter
 *            → UI notified: "book detected: Matthew"
 *
 *   t=1100ms partial: "...Matthew chapter one"
 *            → scan: book+chapter found → state.chapter=1 set, waiting for verse
 *
 *   t=1400ms partial: "...Matthew chapter one verse 5"
 *            → scan: FULL REFERENCE → fetch Matthew 1:5 → PROJECT immediately
 *            → speaker still saying "where we are reminded..."
 *
 *   t=1600ms speech_final fires → Tier 3 final confirms same ref → dedup skips
 *
 * Three-tier pipeline:
 *   Tier 1 (partial_raw): predictive accumulator + immediate full-ref detection
 *   Tier 2 (eot/utterance_end): flush accumulated partial on end-of-turn
 *   Tier 3 (final): final confirmation — dedup prevents double projection
 */

/** Tracks the progressive state of a reference being assembled from partials */
interface PartialReferenceState {
  book: string | null;
  chapter: number | null;
  verse: number | null;
  verseEnd: number | null;
  lastPartialText: string;
  bookDetectedAt: number;
}

/**
 * QC59b (V2 port): Guard against premature verse-1 projection on partials.
 *
 * When FastBibleParser matches only "Genesis chapter 2" (no verse spoken yet),
 * it returns verse_start=1 as a default. On a PARTIAL transcript this causes
 * Genesis 2:1 to project immediately — then corrects to the actual verse when
 * the number is finally heard.
 *
 * This guard returns true only when verse_start=1 is EXPLICITLY spoken:
 *   - The digit "1" appears after the chapter number in the text, OR
 *   - The word "one" appears after the chapter number, OR
 *   - A colon-notation ":1" is present (e.g. "Genesis 2:1")
 *
 * For verse_start > 1 the guard always returns true (no ambiguity).
 * For the FINAL transcript path this guard is NOT applied — defaults are fine there.
 */
function hasExplicitVerse(text: string, _verseStart: number): boolean {
  // QC59b strict mode: the partial scanner must NEVER project unless a verse
  // number is explicitly present in the raw transcript text.
  // This applies to ALL verses — there are no defaults or fallbacks on partials.
  // The final/EOT path is unaffected (this function is only called from processPartial).
  const t = text.toLowerCase();

  // Colon notation: "genesis 2:8" / "john 3:16"
  if (/:\d+\b/.test(t)) return true;

  // "verse N" / "verse one" / "verse twenty" etc.
  if (/\bverse\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)\b/.test(t)) return true;

  // "v. N" / "v N"
  if (/\bv\.?\s+\d+\b/.test(t)) return true;

  // Compact spoken: chapter number followed by a space and a digit
  // e.g. "genesis chapter 2 8" / "matthew chapter 5 3"
  if (/\bchapter\s+\d+\s+\d+\b/.test(t)) return true;

  // Space-separated compact: "john 3 16" / "genesis 2 8"
  // Must have book + two distinct numbers
  if (/\b\d+\s+\d+\b/.test(t)) return true;

  // No explicit verse found — suppress partial projection
  return false;
}

/**
 * Build a stable dedup key from a command's arguments.
 * Keyed on book+chapter+verse_start so that:
 *   - Same verse projected twice → dedup fires
 *   - Different verses → never blocked
 *   - Navigation/version commands → use full JSON (unchanged behaviour)
 */
function buildDedupKey(cmd: any): string {
  if (cmd.name === "project_bible_reference") {
    const { book, chapter, verse_start } = cmd.arguments;
    return `${cmd.name}:${book}:${chapter}:${verse_start ?? 1}`;
  }
  return JSON.stringify(cmd.arguments);
}

export function setupAudioSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/api/bible/audio-stream" });

  wss.on("connection", (ws: WebSocket) => {
    const sessionStart = Date.now();
    const T = () => `+${Date.now() - sessionStart}ms`;
    console.log(`[AudioSocket] Client connected to live audio stream`);

    // ── Session state ──────────────────────────────────────────────────────
    let lastExecutedReference: string | null = null;
    let lastExecutionTime = 0;
    let currentPartialText = "";
    let currentContext: any = null;
    let strictMode = false;
    let activeVersion = "kjv";
    let traceId: string | null = null;
    let clientClickAt: number | null = null;
    let interimCandidate = { key: "", count: 0, firstSeenAt: 0, lastSeenAt: 0 };

    // Fix 5: Extended dedup window — 5000ms (was 800ms).
    // Covers non-stop speakers who quote a reference mid-sentence and keep
    // talking for several seconds before speech_final fires.
    const DEDUP_WINDOW_MS = 5000;
    const CONFIDENCE_THRESHOLD = 0.75;
    const INTERIM_MEDIUM_CONFIDENCE = 0.65;
    const INTERIM_HIGH_CONFIDENCE = 0.85;
    const hasStrictCommandCue = (text: string) =>
      /\b(?:bible|show|project|display|open|turn\s+to|go\s+to|read(?:\s+from)?)\b/i.test(text);

    // Predictive accumulator — tracks in-progress reference assembly
    let partialState: PartialReferenceState = {
      book: null,
      chapter: null,
      verse: null,
      verseEnd: null,
      lastPartialText: "",
      bookDetectedAt: 0,
    };

    // Reset the partial accumulator (called on final/EOT)
    const resetPartialState = () => {
      partialState = {
        book: null,
        chapter: null,
        verse: null,
        verseEnd: null,
        lastPartialText: "",
        bookDetectedAt: 0,
      };
      interimCandidate = { key: "", count: 0, firstSeenAt: 0, lastSeenAt: 0 };
    };

    // ── Deepgram service ───────────────────────────────────────────────────
    const transcriptionService = new DeepgramTranscriptionService();

    transcriptionService.on("connecting", () =>
      ws.send(JSON.stringify({ type: "connection_status", status: "connecting" }))
    );
    transcriptionService.on("connected", () =>
      ws.send(JSON.stringify({ type: "connection_status", status: "connected" }))
    );
    transcriptionService.on("disconnected", () =>
      ws.send(JSON.stringify({ type: "connection_status", status: "disconnected" }))
    );

    transcriptionService.connect();

    // ── Command execution ──────────────────────────────────────────────────
    const executeCommand = async (cmd: any, source: string) => {
      // Fix 5: Use reference-keyed dedup (book+chapter+verse) with 5s window
      const refKey = buildDedupKey(cmd);
      const now = Date.now();

      if (refKey === lastExecutedReference && now - lastExecutionTime < DEDUP_WINDOW_MS) {
        console.log(`[AudioSocket] Dedup skip [${source}]: ${refKey} (${now - lastExecutionTime}ms ago)`);
        return;
      }

      lastExecutedReference = refKey;
      lastExecutionTime = now;

      const executionStartedAt = Date.now();
      const conf = cmd._confidence != null ? ` [conf: ${cmd._confidence.toFixed(2)}]` : "";
      console.log(`[AudioSocket][${T()}] EXECUTE [${source}]${conf}: ${cmd.name}`, cmd.arguments);

      if (cmd.name === "project_bible_reference") {
        const { book, chapter, verse_start, verse_end, version } = cmd.arguments;
        const result = await BibleService.searchBible({
          book,
          chapter,
          verseStart: verse_start,
          verseEnd: verse_end,
          version: version?.toLowerCase() || activeVersion,
        });

        if (result) {
          console.log(`[AudioSocket][${T()}] BIBLE_MATCH SENT: ${result.book} ${result.chapter}:${result.verses?.[0]?.verse}`);
          ws.send(JSON.stringify({
            type: "bible_match",
            result,
            commandType: "lookup",
            telemetry: {
              source,
              traceId,
              clientClickAt,
              commandStartedAt: executionStartedAt,
              serverResolvedAt: Date.now(),
              serverLookupMs: Date.now() - executionStartedAt,
            },
          }));
          currentContext = {
            book: result.book,
            chapter: result.chapter,
            verseStart: result.verses[0].verse,
          };
          transcriptionService.setContext(currentContext);
        }

      } else if (cmd.name === "navigate_bible") {
        const { direction, scope, verse: targetVerse } = cmd.arguments;
        // QC63: Map internal direction names to client-expected values.
        // Server uses "prev"; client onNavigation callback expects "previous".
        // Server uses "goto"; client expects commandType="jump_to_verse" + targetVerse.
        let commandType: string;
        let clientDirection: "next" | "previous" | undefined;

        if (direction === "goto" && scope === "verse") {
          commandType = "jump_to_verse";
          clientDirection = undefined;
        } else if (scope === "chapter") {
          commandType = "chapter_change";
          clientDirection = direction === "next" ? "next" : "previous";
        } else {
          commandType = "verse_change";
          clientDirection = direction === "next" ? "next" : "previous";
        }

        ws.send(JSON.stringify({
          type: "navigation",
          commandType,
          direction: clientDirection,
          ...(targetVerse !== undefined ? { targetVerse } : {}),
        }));

      } else if (cmd.name === "switch_bible_version") {
        activeVersion = cmd.arguments.version.toLowerCase();
        ws.send(JSON.stringify({
          type: "version_change",
          requestedVersion: activeVersion,
        }));
      }
    };

    // ── Predictive accumulator ─────────────────────────────────────────────
    /**
     * Called on every partial_raw event. Implements the progressive detection:
     *   1. Try to parse a FULL reference immediately (highest priority)
     *   2. If not found, check if we have a partial state to update:
     *      - No state: scan for book-only → set state.book
     *      - Has book: scan for book+chapter → set state.chapter
     *      - Has book+chapter: scan for full ref again (verse may have just arrived)
     *   3. Notify UI of progressive state changes
     */
    const processPartial = async (
      text: string,
      confidence: number,
      displayText = text,
    ) => {
      // Always send live transcript to UI
      ws.send(JSON.stringify({
        type: "transcript_partial",
        text: displayText,
        confidence,
        serverReceivedAt: Date.now(),
      }));

      if (confidence < INTERIM_MEDIUM_CONFIDENCE) {
        console.log(
          `[AudioSocket] Ignoring low-confidence interim (${confidence?.toFixed(2)})`,
        );
        return;
      }

      // ── Step 1: Try full reference parse first ─────────────────────────
      const fullCmd = FastBibleParser.parse(text);
      if (fullCmd && fullCmd.name === "project_bible_reference") {
        // QC59b (V2 port): Guard against premature verse-1 default projection.
        // If verse_start=1 was not explicitly spoken (e.g. only "Genesis chapter 2"
        // was heard so far), hold off — the verse number is still incoming.
        // This prevents the pattern: project Gen 2:1 → immediately correct to Gen 2:8.
        const verseStart = fullCmd.arguments?.verse_start ?? 1;
        if (!hasExplicitVerse(text, verseStart)) {
          console.log(`[AudioSocket] QC59b: Partial verse-1 default suppressed — waiting for explicit verse in: "${text.slice(0, 60)}"`);
          // Still update progressive state so we track book+chapter
          const stage = FastBibleParser.parseStage(text);
          if (stage?.type === "book_chapter") {
            partialState.book = stage.book;
            partialState.chapter = stage.chapter;
            if (!partialState.bookDetectedAt) partialState.bookDetectedAt = Date.now();
          }
          return;
        }
        if (strictMode && !hasStrictCommandCue(text)) {
          console.log(
            `[AudioSocket] Strict mode: explicit command cue not yet present`,
          );
          return;
        }
        const candidateKey = buildDedupKey(fullCmd);
        const candidateNow = Date.now();
        const sameCandidate = interimCandidate.key === candidateKey &&
          candidateNow - interimCandidate.lastSeenAt < 1500;
        interimCandidate = {
          key: candidateKey,
          count: sameCandidate ? interimCandidate.count + 1 : 1,
          firstSeenAt: sameCandidate ? interimCandidate.firstSeenAt : candidateNow,
          lastSeenAt: candidateNow,
        };
        const requiredResults =
          confidence >= INTERIM_HIGH_CONFIDENCE ? 1 : 2;
        if (interimCandidate.count < requiredResults) {
          console.log(
            `[AudioSocket] Holding interim ${candidateKey}: ` +
            `${interimCandidate.count}/${requiredResults} at confidence ${confidence?.toFixed(2)}`,
          );
          return;
        }
        // Full reference found with explicit verse — execute immediately and reset state
        await executeCommand(fullCmd, "Partial");
        resetPartialState();
        return;
      }

      // Handle navigation/version commands immediately
      if (fullCmd && fullCmd.name !== "project_bible_reference") {
        await executeCommand(fullCmd, "Partial");
        return;
      }

      // ── Step 2: Progressive accumulation ──────────────────────────────
      const stage = FastBibleParser.parseStage(text);

      if (!stage) {
        // No book detected yet — if we had a state older than 5s, reset it
        if (partialState.book && Date.now() - partialState.bookDetectedAt > 5000) {
          resetPartialState();
        }
        return;
      }

      if (stage.type === "book_only") {
        // New book detected — start or update accumulator
        if (partialState.book !== stage.book) {
          console.log(`[AudioSocket] Predictive: book detected → "${stage.book}"`);
          partialState.book = stage.book;
          partialState.chapter = null;
          partialState.verse = null;
          partialState.bookDetectedAt = Date.now();
          // Notify UI that a book has been detected (for visual feedback)
          ws.send(JSON.stringify({ type: "book_detected", book: stage.book }));
        }

      } else if (stage.type === "book_chapter" && stage.book && stage.chapter) {
        // Book + chapter detected — update accumulator
        if (partialState.book !== stage.book || partialState.chapter !== stage.chapter) {
          console.log(`[AudioSocket] Predictive: book+chapter → "${stage.book} ${stage.chapter}"`);
          partialState.book = stage.book;
          partialState.chapter = stage.chapter;
          partialState.verse = null;
          if (!partialState.bookDetectedAt) partialState.bookDetectedAt = Date.now();
          ws.send(JSON.stringify({
            type: "reference_stage",
            stage: "book_chapter",
            book: stage.book,
            chapter: stage.chapter,
            serverDetectedAt: Date.now(),
          }));
        }
      }
    };

    // ── Tier 1: Partial (streaming, mid-sentence) ──────────────────────────
    transcriptionService.on("partial_raw", async (
      recognitionText: string,
      confidence: number,
      displayText?: string,
    ) => {
      currentPartialText = recognitionText;
      console.log(
        `[AudioSocket][${T()}] PARTIAL [conf:${confidence?.toFixed(2)}]: "${recognitionText.slice(0,80)}"`,
        {
          traceId,
          clickToPartialMs: clientClickAt ? Date.now() - clientClickAt : undefined,
        },
      );
      await processPartial(
        recognitionText,
        confidence,
        displayText || recognitionText,
      );
    });

    // ── Tier 2: End-of-turn flush ──────────────────────────────────────────
    const handleEOT = async (label: string) => {
      const textToFlush = currentPartialText;
      if (!textToFlush) return;

      console.log(`[AudioSocket] ${label} — flushing: "${textToFlush}"`);

      // Try full parse on the accumulated text
      const cmd = FastBibleParser.parse(textToFlush);
      if (cmd) await executeCommand(cmd, label);

      resetPartialState();
    };

    transcriptionService.on("eager_eot",     () => handleEOT("EagerEndOfTurn"));
    transcriptionService.on("eot",           () => handleEOT("EndOfTurn"));
    transcriptionService.on("utterance_end", () => handleEOT("UtteranceEnd"));

    // ── Tier 3: Final transcript ───────────────────────────────────────────
    transcriptionService.on("final", async (
      displayText: string,
      confidence: number,
      recognitionText?: string,
    ) => {
      const textToParse = recognitionText || displayText;
      console.log(`[AudioSocket][${T()}] FINAL [conf:${confidence?.toFixed(2)}]: "${textToParse.slice(0,80)}"`);
      currentPartialText = "";
      resetPartialState();

      ws.send(JSON.stringify({ type: "transcript_final", text: displayText }));

      if (confidence != null && confidence < CONFIDENCE_THRESHOLD) {
        console.log(`[AudioSocket] Final below threshold (${confidence?.toFixed(2)}) — skipping`);
        return;
      }

      const cmd = FastBibleParser.parse(textToParse);
      if (cmd) await executeCommand(cmd, "Final");
    });

    // ── Error handling ─────────────────────────────────────────────────────
    transcriptionService.on("error", (err) => {
      console.error("[Deepgram] Error:", err);
      ws.send(JSON.stringify({ type: "connection_status", status: "disconnected" }));
      ws.send(JSON.stringify({ type: "error", message: "Transcription Service Error" }));
    });

    // ── Incoming messages from desktop client ─────────────────────────────
    let firstAudioAt = 0;
    let audioChunkCount = 0;
    let audioByteCount = 0;
    ws.on("message", async (data: Buffer, isBinary: boolean) => {
      if (!isBinary) {
        try {
          const msg = JSON.parse(data.toString());

          if (msg.type === "set_strict_mode") {
            strictMode = !!msg.strictMode;
            transcriptionService.setStrictMode(strictMode);
            console.log(`[AudioSocket] Strict mode: ${msg.strictMode}`);
          }

          if (msg.type === "set_bible_version") {
            const requestedVersion = String(msg.version || "").toLowerCase();
            if (["kjv", "nkjv", "niv", "esv", "amp", "msg"].includes(requestedVersion)) {
              activeVersion = requestedVersion;
              console.log(`[AudioSocket] Active Bible version: ${activeVersion.toUpperCase()}`);
            }
          }

          if (msg.type === "hfb_trace_start") {
            traceId = String(msg.traceId || "");
            clientClickAt = Number(msg.clientClickAt) || null;
            firstAudioAt = 0;
            audioChunkCount = 0;
            audioByteCount = 0;
            currentPartialText = "";
            resetPartialState();
            transcriptionService.resetTranscriptContext();
            console.log("[HFB Trace] Session started", {
              traceId,
              clientToServerControlMs: clientClickAt
                ? Date.now() - clientClickAt
                : undefined,
            });
          }

          // ── vad_commit: Silero VAD on the desktop detected end-of-speech ──
          // The desktop's Silero VAD fires ~192ms after silence — much faster
          // than Deepgram's endpointing signal (~100–300ms after silence).
          // When vad_commit arrives, immediately flush the partial accumulator
          // so the verse is projected without waiting for Deepgram's final.
          //
          // This is the most impactful single fix for conversational references:
          // the pastor says "John 3:16" mid-sentence, keeps talking, and Silero
          // detects the brief pause after the reference — triggering projection
          // ~200ms earlier than Deepgram's endpointing would.
          if (msg.type === "vad_commit") {
            console.log(`[AudioSocket] vad_commit received — flushing partial accumulator immediately`);
            await handleEOT("VadCommit");
          }

        } catch (_) {}
        return;
      }
      if (!firstAudioAt) {
        firstAudioAt = Date.now();
        console.log(`[AudioSocket][${T()}] FIRST AUDIO CHUNK received`, {
          traceId,
          clickToServerAudioMs: clientClickAt
            ? firstAudioAt - clientClickAt
            : undefined,
        });
        ws.send(JSON.stringify({ type: "audio_status", status: "receiving" }));
      }
      audioChunkCount += 1;
      audioByteCount += data.length;
      if (audioChunkCount === 1 || audioChunkCount % 25 === 0) {
        let sumSquares = 0;
        let peak = 0;
        const sampleCount = Math.floor(data.length / 2);
        for (let offset = 0; offset + 1 < data.length; offset += 2) {
          const sample = data.readInt16LE(offset);
          sumSquares += sample * sample;
          peak = Math.max(peak, Math.abs(sample));
        }
        console.log("[AudioSocket] PCM diagnostics", {
          chunk: audioChunkCount,
          chunkBytes: data.length,
          totalBytes: audioByteCount,
          rms: Math.round(Math.sqrt(sumSquares / Math.max(1, sampleCount))),
          peak,
        });
      }
      transcriptionService.sendAudio(data);
    });

    ws.on("close", () => {
      console.log("[AudioSocket] Client disconnected");
      transcriptionService.stop();
    });

    ws.on("error", (error) => {
      console.error("[AudioSocket] WebSocket error:", error);
      transcriptionService.stop();
    });
  });

  return wss;
}
