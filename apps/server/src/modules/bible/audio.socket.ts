import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { DeepgramTranscriptionService } from "./deepgram.service.js";
import { BibleService } from "./bible.service.js";
import { FastBibleParser } from "./fast-bible-parser.js";
import { isBibleVersionCode } from "./bible-translations.js";

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
function buildDedupKey(cmd: any, context?: any): string {
  if (cmd.name === "project_bible_reference") {
    const { book, chapter, verse_start } = cmd.arguments;
    return `${cmd.name}:${book}:${chapter}:${verse_start ?? 1}`;
  }
  if (cmd.name === "navigate_bible") {
    return `${JSON.stringify(cmd.arguments)}@${context?.book || ""}:${context?.chapter || ""}:${context?.verseStart || ""}`;
  }
  return `${cmd.name}:${JSON.stringify(cmd.arguments)}`;
}

function isDeterministicContextNavigation(cmd: any): boolean {
  return cmd?.name === "navigate_bible" &&
    cmd.arguments?.direction === "goto" &&
    cmd.arguments?.scope === "chapter_verse" &&
    Number(cmd.arguments?.chapter) > 0 &&
    Number(cmd.arguments?.verse) > 0;
}

export function setupAudioSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/api/bible/audio-stream" });

  wss.on("connection", (ws: WebSocket) => {
    const sessionStart = Date.now();
    const T = () => `+${Date.now() - sessionStart}ms`;
    console.log(`[AudioSocket] Client connected to live audio stream`);

    // ── Session state ──────────────────────────────────────────────────────
    const recentlyExecuted = new Map<string, number>();
    let currentPartialText = "";
    let currentContext: any = null;
    let strictMode = false;
    let activeVersion = "kjv";
    let traceId: string | null = null;
    let clientClickAt: number | null = null;
    let projectionSequence = 0;
    let commandQueue: Promise<void> = Promise.resolve();
    const executedOccurrences = new Map<string, number>();
    const interimOccurrences = new Map<string, { count: number; lastSeenAt: number }>();

    // Occurrence tracking handles partial/final replay for the whole utterance.
    // These short guards only collapse duplicate transport events; navigation
    // includes its starting context so legitimate consecutive commands remain valid.
    const REFERENCE_DEDUP_WINDOW_MS = 1500;
    const NAVIGATION_DEDUP_WINDOW_MS = 650;
    const EXECUTED_OCCURRENCE_TTL_MS = 10000;
    const INTERIM_HIGH_CONFIDENCE = 0.85;
    const hasStrictCommandCue = (text: string) =>
      /\b(?:bible|show(?:\s+me)?|project|display|open|turn\s+to|go\s+to|take\s+me\s+to|look\s+(?:at|to)|let'?s\s+(?:see|read|look)|let\s+us\s+see|can\s+we\s+see|read(?:\s+from)?|in|opening|reading|from|scripture|verse|chapter)\b/i.test(text);

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
    };

    const resetUtteranceTracking = () => {
      interimOccurrences.clear();
      resetPartialState();
      // Clean up stale executed occurrences older than TTL
      const now = Date.now();
      for (const [key, at] of executedOccurrences) {
        if (now - at > EXECUTED_OCCURRENCE_TTL_MS) executedOccurrences.delete(key);
      }
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
    transcriptionService.on("speech_started", () => {
      // A new VAD turn gets a fresh occurrence namespace. Final/EOT callbacks
      // from the previous turn remain harmless because they retain their seen
      // occurrences until this explicit new-speech boundary.
      currentPartialText = "";
      resetUtteranceTracking();
    });

    // ── Command execution ──────────────────────────────────────────────────
    const executeCommand = async (cmd: any, source: string) => {
      // Transport-level duplicate guard. Per-utterance occurrence tracking is
      // the primary replay protection and does not expire while text is active.
      const contextBeforeCommand = currentContext ? { ...currentContext } : null;
      const refKey = buildDedupKey(cmd, contextBeforeCommand);
      const now = Date.now();
      const lastExecutionTime = recentlyExecuted.get(refKey) || 0;
      const dedupWindow = cmd.name === "navigate_bible"
        ? NAVIGATION_DEDUP_WINDOW_MS
        : REFERENCE_DEDUP_WINDOW_MS;

      if (lastExecutionTime && now - lastExecutionTime < dedupWindow) {
        console.log(`[AudioSocket] Dedup skip [${source}]: ${refKey} (${now - lastExecutionTime}ms ago)`);
        return;
      }

      recentlyExecuted.set(refKey, now);
      for (const [key, executedAt] of recentlyExecuted) {
        if (now - executedAt >= REFERENCE_DEDUP_WINDOW_MS) recentlyExecuted.delete(key);
      }

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
            projectionSequence: ++projectionSequence,
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
        const {
          direction,
          scope,
          chapter: targetChapter,
          verse: targetVerse,
        } = cmd.arguments;

        // Keep navigation authoritative on this socket so consecutive commands
        // see the context produced by the immediately preceding command.
        if (currentContext?.book) {
          let chapter = currentContext.chapter;
          let verse = currentContext.verseStart;
          if (direction === "goto" && scope === "chapter_verse") {
            chapter = Number(targetChapter);
            verse = Number(targetVerse);
          } else if (direction === "goto" && scope === "verse") {
            verse = Number(targetVerse);
          } else if (scope === "chapter") {
            chapter = Math.max(1, chapter + (direction === "next" ? 1 : -1));
            verse = 1;
          } else if (scope === "verse") {
            if (direction === "prev" && verse <= 1 && chapter > 1) {
              chapter -= 1;
              verse = (await BibleService.getChapterMaxVerse(currentContext.book, chapter)) || 1;
            } else {
              verse = Math.max(1, verse + (direction === "next" ? 1 : -1));
            }
          }

          let result = await BibleService.searchBible({
            book: currentContext.book,
            chapter,
            verseStart: verse,
            version: activeVersion as any,
          });

          // Cross chapter boundaries for next/previous verse navigation.
          if (!result && scope === "verse" && direction === "next") {
            chapter += 1;
            verse = 1;
            result = await BibleService.searchBible({
              book: currentContext.book, chapter, verseStart: verse,
              version: activeVersion as any,
            });
          }

          if (result?.verses?.length) {
            const commandType = direction === "goto" && scope === "chapter_verse"
              ? "jump_to_chapter_verse"
              : direction === "goto" && scope === "verse"
                ? "jump_to_verse"
                : scope === "chapter" ? "chapter_change" : "verse_change";
            ws.send(JSON.stringify({
              type: "bible_match",
              result,
              commandType,
              projectionSequence: ++projectionSequence,
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
            console.log(
              `[AudioSocket][${T()}] NAV SENT: ${result.book} ${result.chapter}:${result.verses[0].verse}`,
            );
            return;
          }
        }
        // QC63: Map internal direction names to client-expected values.
        // Server uses "prev"; client onNavigation callback expects "previous".
        // Server uses "goto"; client expects commandType="jump_to_verse" + targetVerse.
        let commandType: string;
        let clientDirection: "next" | "previous" | undefined;

        if (direction === "goto" && scope === "chapter_verse") {
          commandType = "jump_to_chapter_verse";
          clientDirection = undefined;
        } else if (direction === "goto" && scope === "verse") {
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
          ...(targetChapter !== undefined ? { targetChapter } : {}),
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

    const enqueueCommand = (cmd: any, source: string) => {
      const scheduled = commandQueue.then(() => executeCommand(cmd, source));
      commandQueue = scheduled.catch((error) => {
        console.error(`[AudioSocket] Command queue failure [${source}]`, error);
      });
      return scheduled;
    };

    const commandOccurrenceEntries = (commands: any[]) => {
      const counts = new Map<string, number>();
      return commands.map((command) => {
        const base = `${command.name}:${JSON.stringify(command.arguments)}`;
        const occurrence = (counts.get(base) || 0) + 1;
        counts.set(base, occurrence);
        return { command, occurrenceKey: `${base}#${occurrence}` };
      });
    };

    const executeTranscriptCommands = async (
      text: string,
      source: string,
      confidence: number,
      isFinal: boolean,
    ) => {
      const commands = FastBibleParser.scanForCommands(text);
      if (!commands.length) return false;

      let acceptedAny = false;
      const now = Date.now();
      for (const { command, occurrenceKey } of commandOccurrenceEntries(commands)) {
        const lastExecuted = executedOccurrences.get(occurrenceKey);
        if (lastExecuted && now - lastExecuted < EXECUTED_OCCURRENCE_TTL_MS) continue;
        if (
          !isFinal &&
          command.name === "project_bible_reference" &&
          !hasExplicitVerse(text, command.arguments?.verse_start ?? 1)
        ) continue;
        if (
          strictMode &&
          command.name === "project_bible_reference" &&
          !hasStrictCommandCue(text)
        ) continue;

        const previous = interimOccurrences.get(occurrenceKey);
        const stableCount = previous && now - previous.lastSeenAt < 1500
          ? previous.count + 1
          : 1;
        interimOccurrences.set(occurrenceKey, { count: stableCount, lastSeenAt: now });

        if (!isFinal) {
          const deterministicNavigation = command.name === "navigate_bible";
          const structurallyCompleteReference =
            command.name === "project_bible_reference" && command._confidence >= 0.88;
          // Deterministic navigation commands execute immediately on first partial (requiredResults = 1)
          const requiredResults = (deterministicNavigation || confidence >= INTERIM_HIGH_CONFIDENCE)
            ? 1
            : confidence >= 0.5 && structurallyCompleteReference
              ? 2
              : Infinity;
          if (stableCount < requiredResults) continue;
        }

        executedOccurrences.set(occurrenceKey, now);
        acceptedAny = true;
        await enqueueCommand(command, source);
      }
      return acceptedAny;
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
      // Scan for any Bible references in partial text to provide live UI highlighting metadata
      const scannedCmds = FastBibleParser.scanForCommands(text);
      const detectedReferences = scannedCmds
        .filter((c) => c.name === "project_bible_reference")
        .map((c) => ({
          book: c.arguments.book,
          chapter: c.arguments.chapter,
          verse: c.arguments.verse_start,
          formatted: `${c.arguments.book} ${c.arguments.chapter}:${c.arguments.verse_start}`,
          start: c._start,
          end: c._end,
        }));

      // Always send live transcript to UI with detected references
      ws.send(JSON.stringify({
        type: "transcript_partial",
        text: displayText,
        confidence,
        detectedReferences,
        serverReceivedAt: Date.now(),
      }));

      const versionCommand = FastBibleParser.parse(text);
      if (versionCommand?.name === "switch_bible_version") {
        const occurrenceKey = `${versionCommand.name}:${JSON.stringify(versionCommand.arguments)}#1`;
        if (!executedOccurrences.has(occurrenceKey) && confidence >= 0.5) {
          executedOccurrences.set(occurrenceKey, Date.now());
          await enqueueCommand(versionCommand, "Partial");
        }
      }

      if (await executeTranscriptCommands(text, "Partial", confidence, false)) {
        resetPartialState();
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
      currentPartialText = "";

      console.log(`[AudioSocket] ${label} — flushing: "${textToFlush}"`);

      if (!await executeTranscriptCommands(textToFlush, label, 1, true)) {
        const cmd = FastBibleParser.parse(textToFlush);
        if (cmd && cmd.name === "switch_bible_version") await enqueueCommand(cmd, label);
      }

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

      const deterministicCommand = FastBibleParser.parse(textToParse);

      if (confidence != null && confidence < 0.5) {
        if (!isDeterministicContextNavigation(deterministicCommand) || confidence < 0.4) {
          console.log(`[AudioSocket] Final below threshold (${confidence?.toFixed(2)}) — skipping`);
          return;
        }
      }

      if (!await executeTranscriptCommands(textToParse, "Final", confidence ?? 1, true)) {
        if (deterministicCommand?.name === "switch_bible_version") {
          await enqueueCommand(deterministicCommand, "Final");
        }
      }
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
            if (isBibleVersionCode(requestedVersion)) {
              activeVersion = requestedVersion;
              console.log(`[AudioSocket] Active Bible version: ${activeVersion.toUpperCase()}`);
            }
          }

          if (msg.type === "set_bible_context") {
            const book = String(msg.book || "").trim();
            const chapter = Number(msg.chapter);
            const verseStart = Number(msg.verse);
            if (book && chapter > 0 && verseStart > 0) {
              currentContext = { book, chapter, verseStart };
              transcriptionService.setContext(currentContext);
              console.log(
                `[AudioSocket] Active Bible context: ${book} ${chapter}:${verseStart}`,
              );
            }
          }

          if (msg.type === "hfb_trace_start") {
            traceId = String(msg.traceId || "");
            clientClickAt = Number(msg.clientClickAt) || null;
            firstAudioAt = 0;
            audioChunkCount = 0;
            audioByteCount = 0;
            currentPartialText = "";
            resetUtteranceTracking();
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
