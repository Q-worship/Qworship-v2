import { EventEmitter } from "events";
import WebSocket from "ws";

export class DeepgramTranscriptionService extends EventEmitter {
  private socket: WebSocket | null = null;
  private isConnecting = false;
  private apiKey: string;

  constructor() {
    super();
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      throw new Error("DEEPGRAM_API_KEY is not set");
    }
    this.apiKey = apiKey;
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
    console.log("[Deepgram] Connecting with nova-3...");

    // Build the Deepgram WebSocket URL with parameters
    const deepgramUrl = new URL("wss://api.deepgram.com/v1/listen");
    deepgramUrl.searchParams.append("model", "nova-3");
    deepgramUrl.searchParams.append("language", "en-US");
    deepgramUrl.searchParams.append("smart_format", "true");
    deepgramUrl.searchParams.append("interim_results", "true");
    deepgramUrl.searchParams.append("endpointing", "300");
    deepgramUrl.searchParams.append("punctuate", "true");
    deepgramUrl.searchParams.append("dictation", "true");
    deepgramUrl.searchParams.append("numerals", "true");
    deepgramUrl.searchParams.append("encoding", "linear16");
    deepgramUrl.searchParams.append("sample_rate", "16000");
    deepgramUrl.searchParams.append("channels", "1");

    try {
      // Create WebSocket connection
      this.socket = new WebSocket(deepgramUrl.toString(), {
        headers: {
          Authorization: `Token ${this.apiKey}`,
        },
      });

      // Set up event handlers
      this.socket.on("open", () => {
        this.isConnecting = false;
        this.emit("connected");
        console.log("[Deepgram] Connection established");
      });

      this.socket.on("message", (data: WebSocket.Data) => {
        try {
          const response = JSON.parse(data.toString());

          // Handle different message types
          if (response.type === "Results") {
            const transcript = response.channel?.alternatives?.[0]?.transcript;
            const isFinal = response.is_final;

            if (transcript && transcript.trim()) {
              if (isFinal) {
                this.emit("final", transcript);
              } else {
                this.emit("partial_raw", transcript);
              }
            }
          }

          // Log errors from Deepgram
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
        this.emit("error", err);
      });

      this.socket.on("close", (code, reason) => {
        console.log(`[Deepgram] Connection closed: ${code} - ${reason}`);
        this.isConnecting = false;
        this.emit("disconnected");
        this.cleanup();
      });

      // Wait for connection to be open
      await this.waitForOpen();
    } catch (err) {
      this.isConnecting = false;
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
    if (this.socket) {
      console.log("[Deepgram] Closing connection...");

      // Send CloseStream message for graceful termination
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
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket = null;
    }
    this.isConnecting = false;
  }
}
