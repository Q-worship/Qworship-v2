import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import OpenAI from "openai";
import { DeepgramTranscriptionService } from "./deepgram.service.js";
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

    // Initialize Deepgram streaming service
    const transcriptionService = new DeepgramTranscriptionService();

    transcriptionService.on("connecting", () => {
      ws.send(
        JSON.stringify({ type: "connection_status", status: "connecting" }),
      );
    });

    transcriptionService.on("connected", () => {
      ws.send(
        JSON.stringify({ type: "connection_status", status: "connected" }),
      );
    });

    transcriptionService.on("disconnected", () => {
      ws.send(
        JSON.stringify({ type: "connection_status", status: "disconnected" }),
      );
    });

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

    // NEW: Convert transcript to command using OpenAI
    const convertToCommand = async (text: string) => {
      try {
        const openai = getOpenAI();

        // Only call OpenAI if text is substantial
        if (!text.trim() || text.length < 3) return null;

        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `You are a Bible reference parser. Convert user speech to JSON commands.
                
                Possible commands with exact format:
                
                1. Bible verse lookup: {"name": "project_bible_reference", "arguments": {"book": string, "chapter": number, "verse_start": number, "verse_end": number|null, "version": string}}
                   Examples:
                   - "Show me John 3:16" → {"name":"project_bible_reference","arguments":{"book":"John","chapter":3,"verse_start":16,"verse_end":null,"version":"kjv"}}
                   - "Read Psalm 23" → {"name":"project_bible_reference","arguments":{"book":"Psalm","chapter":23,"verse_start":1,"verse_end":null,"version":"kjv"}}
                   - "Show me Genesis 1:1-5" → {"name":"project_bible_reference","arguments":{"book":"Genesis","chapter":1,"verse_start":1,"verse_end":5,"version":"kjv"}}
                   - "Switch to NIV and show me Romans 8:28" → {"name":"project_bible_reference","arguments":{"book":"Romans","chapter":8,"verse_start":28,"verse_end":null,"version":"niv"}}
                
                2. Navigation: {"name": "navigate_bible", "arguments": {"direction": "next|prev", "scope": "verse|chapter"}}
                   Examples:
                   - "Next verse" → {"name":"navigate_bible","arguments":{"direction":"next","scope":"verse"}}
                   - "Previous chapter" → {"name":"navigate_bible","arguments":{"direction":"prev","scope":"chapter"}}
                   - "Go to next chapter" → {"name":"navigate_bible","arguments":{"direction":"next","scope":"chapter"}}
                
                3. Version switch: {"name": "switch_bible_version", "arguments": {"version": "kjv|niv|esv"}}
                   Examples:
                   - "Switch to NIV" → {"name":"switch_bible_version","arguments":{"version":"niv"}}
                   - "Change to ESV" → {"name":"switch_bible_version","arguments":{"version":"esv"}}
                   - "Use King James Version" → {"name":"switch_bible_version","arguments":{"version":"kjv"}}
                
                If the user's speech doesn't match any command pattern, return null.
                
                Respond with ONLY the JSON command or null. No other text.`,
            },
            { role: "user", content: text },
          ],
          temperature: 0,
          max_tokens: 150,
        });

        const response = completion.choices[0].message.content;
        if (response && response !== "null") {
          return JSON.parse(response);
        }
        return null;
      } catch (err) {
        console.error("[OpenAI] Failed to parse command:", err);
        return null;
      }
    };

    // Handle AI Native Commands (Tool Calling)
    transcriptionService.on("command", async (cmd: any) => {
      console.log(
        `[AudioSocket] Executing AI Command: ${cmd.name}`,
        cmd.arguments,
      );

      const now = Date.now();
      if (now - lastExecutedCommandTime < 1500) return; // Throttling
      lastExecutedCommandTime = now;

      if (cmd.name === "project_bible_reference") {
        const { book, chapter, verse_start, verse_end, version } =
          cmd.arguments;
        const result = await BibleService.searchBible({
          book,
          chapter,
          verseStart: verse_start,
          verseEnd: verse_end,
          version: version?.toLowerCase() || "kjv",
        });

        if (result) {
          ws.send(
            JSON.stringify({
              type: "bible_match",
              result: result,
              commandType: "lookup",
            }),
          );

          currentContext = {
            book: result.book,
            chapter: result.chapter,
            verseStart: result.verses[0].verse,
          };
          transcriptionService.setContext(currentContext);
        }
      } else if (cmd.name === "navigate_bible") {
        ws.send(
          JSON.stringify({
            type: "navigation",
            commandType:
              cmd.arguments.scope === "chapter"
                ? "chapter_change"
                : "verse_change",
            direction: cmd.arguments.direction,
          }),
        );
      } else if (cmd.name === "switch_bible_version") {
        ws.send(
          JSON.stringify({
            type: "version_change",
            requestedVersion: cmd.arguments.version.toLowerCase(),
          }),
        );
      }
    });

    transcriptionService.on("partial_raw", (text: string) => {
      ws.send(
        JSON.stringify({
          type: "transcript_partial",
          text: text,
        }),
      );
    });

    transcriptionService.on("partial", async (delta: string) => {
      transcriptBuffer += delta;
      await processTranscript(transcriptBuffer, true);
    });

    // MODIFIED: Add command conversion here
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

      // NEW: Convert final transcript to command and emit
      const command = await convertToCommand(text);
      if (command) {
        transcriptionService.emit("command", command);
      }

      await processTranscript(text, false);
    });

    transcriptionService.on("error", (err) => {
      console.error("[Deepgram] Error:", err);
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
            transcriptionService.setStrictMode(isStrictMode);
            console.log(`[AudioSocket] Strict mode set to ${isStrictMode}`);
          }
        } catch (e) {}
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
