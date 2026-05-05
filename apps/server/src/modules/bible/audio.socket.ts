import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import OpenAI from "openai";
import { TranscriptionService } from "./transcription.service.js";
import { BibleService } from "./bible.service.js";

// Lazy-init - avoids cost if never called
let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

export function setupAudioSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/api/bible/audio-stream" });

  wss.on("connection", (ws: WebSocket) => {
    console.log("[AudioSocket] Client connected to live audio stream");

    let transcriptBuffer = "";

    // Initialize OpenAI streaming service
    const transcriptionService = new TranscriptionService();
    transcriptionService.connect();

    let lastExecutedCommandTime = 0;
    let isStrictMode = false;
    let rawUIBuffer = ""; // Added for instant Whisper UI feedback
    let currentContext: any = null; // Track current book/chapter for AI context

    /**
     * DORMANT: Legacy deterministic parser.
     * We have moved to AI-Native Tool Calling for superior accuracy and zero hallucinations.
     */
    const processTranscript = async (text: string, isPartial: boolean) => {
       // This function is now just a placeholder to prevent crashes elsewhere.
       // The actual execution logic is handled in the 'command' event below.
       if (text.includes("[UNINTELLIGIBLE]")) {
         transcriptBuffer = "";
       }
    };

    // Handle AI Native Commands (Tool Calling)
    transcriptionService.on("command", async (cmd: any) => {
      console.log(`[AudioSocket] Executing AI Command: ${cmd.name}`, cmd.arguments);
      
      const now = Date.now();
      if (now - lastExecutedCommandTime < 1500) return; // Throttling
      lastExecutedCommandTime = now;

      if (cmd.name === "project_bible_reference") {
        const { book, chapter, verse_start, verse_end, version } = cmd.arguments;
        const result = await BibleService.searchBible({
          book,
          chapter,
          verseStart: verse_start,
          verseEnd: verse_end,
          version: version?.toLowerCase() || "kjv"
        });

        if (result) {
          ws.send(JSON.stringify({
            type: "bible_match",
            result: result,
            commandType: "lookup"
          }));
          
          currentContext = {
            book: result.book,
            chapter: result.chapter,
            verseStart: result.verses[0].verse
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
          requestedVersion: cmd.arguments.version.toLowerCase()
        }));
      }
    });

    transcriptionService.on("partial_raw", (delta: string) => {
      rawUIBuffer += delta;
      ws.send(
        JSON.stringify({
          type: "transcript_partial",
          text: rawUIBuffer,
        }),
      );
    });

    transcriptionService.on("partial", async (delta: string) => {
      transcriptBuffer += delta;
      await processTranscript(transcriptBuffer, true);
    });

    transcriptionService.on("final", async (text: string) => {
      console.log(`[AudioSocket] Final Transcript: ${text}`);
      transcriptBuffer = ""; 
      rawUIBuffer = ""; 
      ws.send(
        JSON.stringify({
          type: "transcript_final",
          text: text,
        }),
      );
      await processTranscript(text, false);
    });

    transcriptionService.on("error", (err) => {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Transcription Service Error",
        }),
      );
    });

    ws.on("message", async (data: Buffer | string) => {
      if (typeof data === "string") {
        try {
          const msg = JSON.parse(data);
          if (msg.type === "set_strict_mode") {
            isStrictMode = !!msg.strictMode;
            console.log(`[AudioSocket] Strict mode set to ${isStrictMode}`);
          }
        } catch (e) {}
        return;
      }
      transcriptionService.processAudioChunk(data);
    });

    ws.on("close", () => {
      console.log("[AudioSocket] Client disconnected");
      transcriptionService.disconnect();
    });

    ws.on("error", (error) => {
      console.error("[AudioSocket] WebSocket error:", error);
      transcriptionService.disconnect();
    });
  });

  return wss;
}
