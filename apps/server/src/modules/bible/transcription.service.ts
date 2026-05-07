import WebSocket from "ws";
import { EventEmitter } from "events";
import { VoiceCommand } from "./bible.service.js";

// Emit partial/final transcripts and bible matches
export class TranscriptionService extends EventEmitter {
  private openaiWs: WebSocket | null = null;
  private readonly apiUrl =
    "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17";
  private isConnected = false;
  private currentContext: any = null;
  private turnCount: number = 0;
  private itemIds: string[] = []; // Track item IDs for pruning

  constructor() {
    super();
  }

  public setContext(context: any) {
    this.currentContext = context;
    if (this.isConnected) {
      this.updateSession();
    }
  }

  private updateSession() {
    if (!this.openaiWs || !this.isConnected) return;

    const contextStr = this.currentContext 
      ? `Current Reference: ${this.currentContext.book} ${this.currentContext.chapter}:${this.currentContext.verseStart}`
      : "No current reference.";

    this.openaiWs.send(
      JSON.stringify({
        type: "session.update",
        session: {
          modalities: ["text"],
          instructions:
            `You are a specialized Sermon-to-Scripture AI Engine. ${contextStr} ` +
            "TOOL CALLING: You are a command-centric engine. If the user says 'next verse', 'previous chapter', 'go back', " +
            "or mentions a version like 'NKJV' or 'NIV', you MUST call the corresponding tool immediately. " +
            "If they say a number like '11' and a verse was just projected, assume they mean 'verse 11' of the same chapter. " +
            "Understand book names like 'Deuteronomy', 'Philippians', 'Ecclesiastes', 'Philemon', and 'Habakkuk'. " +
            "STRICTNESS: Be proactive with tools. Use 75% confidence for navigation commands. " +
            "TURN FRAGMENTS: VAD is 200ms. Stitch fragments together. " +
            "NEVER be conversational. ONLY output the pure transcript.",
          input_audio_format: "pcm16",
          input_audio_transcription: {
            model: "gpt-4o-transcribe", // Upgraded from whisper-1: GPT-4o-native model handles
            // Bible proper nouns (Deuteronomy, Habakkuk, Ecclesiastes, etc.) far more accurately.
            // Crucially, this transcription feeds the conversation history that GPT-4o uses
            // for tool calling — bad transcriptions from whisper-1 were corrupting verse detection.
            // gpt-4o-transcribe also supports streaming deltas natively (no change needed in event handlers).
            language: "en",
          },
          voice: "alloy",
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 200, // Hyper-aggressive for zero-latency turn detection
          },
          tools: [
            {
              type: "function",
              name: "project_bible_reference",
              description: "Lookup and project a specific Bible verse or range.",
              parameters: {
                type: "object",
                properties: {
                  book: { type: "string", description: "The name of the Bible book." },
                  chapter: { type: "number", description: "The chapter number." },
                  verse_start: { type: "number", description: "The starting verse number." },
                  verse_end: { type: "number", description: "The optional ending verse number." },
                  version: { type: "string", enum: ["KJV", "NKJV", "NIV", "AMP", "MSG", "ESV"], description: "The Bible version." }
                },
                required: ["book", "chapter", "verse_start"]
              }
            },
            {
              type: "function",
              name: "navigate_bible",
              description: "Navigate to the next/previous verse or chapter relative to the current one.",
              parameters: {
                type: "object",
                properties: {
                  direction: { type: "string", enum: ["next", "previous"] },
                  scope: { type: "string", enum: ["verse", "chapter"] }
                },
                required: ["direction", "scope"]
              }
            },
            {
              type: "function",
              name: "switch_bible_version",
              description: "Switch the current Bible version (e.g., KJV, NKJV, NIV, AMP, NLT).",
              parameters: {
                type: "object",
                properties: {
                  version: { type: "string", enum: ["KJV", "NKJV", "NIV", "AMP", "MSG", "ESV", "NLT", "NASB", "KJV-BR", "RVR1960"] }
                },
                required: ["version"]
              }
            }
          ],
          tool_choice: "auto",
        },
      }),
    );
  }

  public connect() {
    console.log("[Transcription] Connecting to OpenAI Realtime...");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("Missing OPENAI_API_KEY in environment");
      this.emit("error", new Error("Missing API Key"));
      return;
    }

    this.openaiWs = new WebSocket(this.apiUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "OpenAI-Beta": "realtime=v1",
      },
    });

    this.openaiWs.on("open", () => {
      this.isConnected = true;
      console.log("[Transcription] Connected to OpenAI Realtime API");
      this.updateSession();
    });

    this.openaiWs.on("message", (data: WebSocket.Data) => {
      try {
        const event = JSON.parse(data.toString());
        // Temporarily log all event types to debug connection
        console.log(`[Transcription] Received OpenAI event: ${event.type}`);
        if (event.type === "error") {
          console.error("[Transcription] OpenAI Error:", event.error);
        }
        this.handleOpenAIEvent(event);
      } catch (err) {
        console.error("Failed to parse OpenAI message", err);
      }
    });

    this.openaiWs.on("close", () => {
      this.isConnected = false;
      console.log("[Transcription] Disconnected from OpenAI");
    });

    this.openaiWs.on("error", (err: Error) => {
      console.error("[Transcription] OpenAI WS Error:", err);
      this.emit("error", err);
    });
  }

  public processAudioChunk(pcmData: Buffer | string) {
    if (!this.isConnected || !this.openaiWs) return;

    let base64Audio;
    if (typeof pcmData === "string") {
      // If frontend already sends base64 PCM chunks
      base64Audio = pcmData;
    } else {
      base64Audio = pcmData.toString("base64");
    }

    this.openaiWs.send(
      JSON.stringify({
        type: "input_audio_buffer.append",
        audio: base64Audio,
      }),
    );
  }

  public commitAudioBuffer() {
    if (!this.isConnected || !this.openaiWs) return;
    this.openaiWs.send(
      JSON.stringify({
        type: "input_audio_buffer.commit",
      }),
    );
    // Manually trigger server VAD response
    this.openaiWs.send(
      JSON.stringify({
        type: "response.create",
      }),
    );
  }

  public disconnect() {
    if (this.openaiWs) {
      if (this.openaiWs.readyState === WebSocket.CONNECTING) {
        // Prevent ws library from emitting unhandled 'error' event to old handlers when closing midway
        this.openaiWs.on("error", () => {});
      }
      try {
        if (this.openaiWs.readyState === WebSocket.OPEN || this.openaiWs.readyState === WebSocket.CONNECTING) {
          this.openaiWs.close();
        }
      } catch (err) {
        // Ignore "WebSocket was closed before the connection was established"
      }
      this.openaiWs = null;
    }
    this.isConnected = false;
  }

  private handleOpenAIEvent(event: any) {
    switch (event.type) {
      // 1. RAW WHISPER DELTA: Extremely fast (100ms lag). 
      // Use this for the "NOW" typing feedback in the UI.
      case "conversation.item.input_audio_transcription.delta":
        this.emit("partial_raw", event.delta); 
        break;

      case "conversation.item.created":
        if (event.item?.id) {
          this.itemIds.push(event.item.id);
          this.turnCount++;
          // PRUNING: Keep only the last 15 items to maintain ultra-low latency.
          // As the sermon goes on, old items become irrelevant for command context.
          if (this.itemIds.length > 15 && this.openaiWs?.readyState === WebSocket.OPEN) {
            const oldId = this.itemIds.shift();
            this.openaiWs.send(JSON.stringify({
              type: "conversation.item.delete",
              item_id: oldId
            }));
          }
        }
        break;

      // 2. USER TRANSCRIPT COMPLETED: Emit the original transcript for the UI history.
      case "conversation.item.input_audio_transcription.completed":
        if (event.transcript) {
          this.emit("final", event.transcript);
        }
        break;

      // 3. ACTUAL FINAL EXECUTION: Triggered ~500ms after the user stops speaking.
      // GPT-4o processes the audio natively, fixing phonetic errors Whisper couldn't understand.
      case "response.done":
        if (event.response?.output) {
          for (const item of event.response.output) {
            if (item.type === "function_call") {
              console.log(`[Transcription] AI Tool Call: ${item.name}`, item.arguments);
              try {
                const args = JSON.parse(item.arguments);
                this.emit("command", {
                  name: item.name,
                  arguments: args
                });
              } catch (e) {
                console.error("Failed to parse tool arguments", e);
              }
            } else if (item.type === "message" && item.content) {
              // We already emit 'final' from Whisper completed above, 
              // but we can log the LLM's corrected version here if we want.
            }
          }
        }
        break;

      case "response.text.delta":
      case "response.audio_transcript.delta":
        // This is the LLM-corrected transcript delta. It follows our instructions.
        this.emit("partial", event.delta);
        break;
    }
  }
}
