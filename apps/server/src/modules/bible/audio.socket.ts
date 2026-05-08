import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { DeepgramTranscriptionService } from "./deepgram.service.js";
import { BibleService } from "./bible.service.js";
import { FastBibleParser } from "./fast-bible-parser.js";

/**
 * setupAudioSocket — QC56 Stage 1
 *
 * Changes from previous version:
 * - REMOVED: convertToCommand() OpenAI GPT-3.5-turbo round-trip (was +300–800ms on every utterance)
 * - REMOVED: OpenAI import and lazy-init (no longer needed)
 * - FastBibleParser is now the SOLE command processor across all three tiers
 * - Tier 1 (partial_raw): scan mid-sentence partials with confidence ≥ 0.80
 * - Tier 2 (eot/utterance_end): flush accumulated partial on end-of-turn
 * - Tier 3 (final): scan final transcript — no fallback API call
 * - Confidence gate added to final handler (mirrors partial_raw gate)
 * - 1500ms command throttle reduced to 800ms (safe dedup window)
 */
export function setupAudioSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/api/bible/audio-stream" });

  wss.on("connection", (ws: WebSocket) => {
    console.log("[AudioSocket] Client connected to live audio stream");

    // ── State ──────────────────────────────────────────────────────────────
    let lastExecutedReference: string | null = null;
    let lastExecutionTime = 0;
    let currentPartialText = "";
    let currentContext: any = null;
    const DEDUP_WINDOW_MS = 800;
    const CONFIDENCE_THRESHOLD = 0.80;

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

    /**
     * Execute a parsed command object. Handles deduplication and throttling.
     * @param cmd  Command from FastBibleParser
     * @param source  Label for logging ("Partial" | "EOT" | "Final")
     */
    const executeCommand = async (cmd: any, source: string) => {
      const refKey = JSON.stringify(cmd.arguments);
      const now = Date.now();

      // Deduplicate: skip if same reference executed within DEDUP_WINDOW_MS
      if (refKey === lastExecutedReference && now - lastExecutionTime < DEDUP_WINDOW_MS) {
        console.log(`[AudioSocket] Dedup skip [${source}]: ${refKey}`);
        return;
      }

      lastExecutedReference = refKey;
      lastExecutionTime = now;

      const conf = cmd._confidence != null ? ` [conf: ${cmd._confidence.toFixed(2)}]` : "";
      console.log(`[AudioSocket] Executing [${source}]${conf}: ${cmd.name}`, cmd.arguments);

      if (cmd.name === "project_bible_reference") {
        const { book, chapter, verse_start, verse_end, version } = cmd.arguments;
        const result = await BibleService.searchBible({
          book,
          chapter,
          verseStart: verse_start,
          verseEnd: verse_end,
          version: version?.toLowerCase() || "kjv",
        });

        if (result) {
          ws.send(JSON.stringify({ type: "bible_match", result, commandType: "lookup" }));
          currentContext = {
            book: result.book,
            chapter: result.chapter,
            verseStart: result.verses[0].verse,
          };
          transcriptionService.setContext(currentContext);
        }

      } else if (cmd.name === "navigate_bible") {
        ws.send(JSON.stringify({
          type: "navigation",
          commandType: cmd.arguments.scope === "chapter" ? "chapter_change" : "verse_change",
          direction: cmd.arguments.direction,
        }));

      } else if (cmd.name === "switch_bible_version") {
        ws.send(JSON.stringify({
          type: "version_change",
          requestedVersion: cmd.arguments.version.toLowerCase(),
        }));
      }
    };

    // ── Tier 1: Partial (streaming, mid-sentence) ──────────────────────────
    transcriptionService.on("partial_raw", async (text: string, confidence: number) => {
      currentPartialText = text;

      // Send live transcript to UI immediately (no gate — always show)
      ws.send(JSON.stringify({ type: "transcript_partial", text }));

      // Fast path: only attempt parse if Deepgram confidence is high enough
      if (confidence < CONFIDENCE_THRESHOLD) return;

      const cmd = FastBibleParser.parse(text);
      if (cmd) await executeCommand(cmd, "Partial");
    });

    // ── Tier 2: End-of-turn flush ──────────────────────────────────────────
    const handleEOT = async (label: string) => {
      if (!currentPartialText) return;
      console.log(`[AudioSocket] ${label} — flushing: "${currentPartialText}"`);
      const cmd = FastBibleParser.parse(currentPartialText);
      if (cmd) await executeCommand(cmd, label);
    };

    transcriptionService.on("eager_eot",    () => handleEOT("EagerEndOfTurn"));
    transcriptionService.on("eot",          () => handleEOT("EndOfTurn"));
    transcriptionService.on("utterance_end",() => handleEOT("UtteranceEnd"));

    // ── Tier 3: Final transcript ───────────────────────────────────────────
    transcriptionService.on("final", async (text: string, confidence: number) => {
      console.log(`[AudioSocket] Final [conf: ${confidence?.toFixed(2)}]: "${text}"`);
      currentPartialText = "";

      // Send final transcript to UI
      ws.send(JSON.stringify({ type: "transcript_final", text }));

      // Apply same confidence gate as partial path
      if (confidence != null && confidence < CONFIDENCE_THRESHOLD) {
        console.log(`[AudioSocket] Final below confidence threshold (${confidence?.toFixed(2)}) — skipping`);
        return;
      }

      const cmd = FastBibleParser.parse(text);
      if (cmd) await executeCommand(cmd, "Final");
      // No OpenAI fallback — FastBibleParser handles all cases locally
    });

    // ── Error handling ─────────────────────────────────────────────────────
    transcriptionService.on("error", (err) => {
      console.error("[Deepgram] Error:", err);
      ws.send(JSON.stringify({ type: "error", message: "Transcription Service Error" }));
    });

    // ── Incoming messages from desktop client ─────────────────────────────
    ws.on("message", async (data: Buffer | string) => {
      if (typeof data === "string") {
        try {
          const msg = JSON.parse(data);
          if (msg.type === "set_strict_mode") {
            transcriptionService.setStrictMode(!!msg.strictMode);
            console.log(`[AudioSocket] Strict mode: ${msg.strictMode}`);
          }
        } catch (_) {}
        return;
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
