import { useState, useRef, useCallback, useEffect } from "react";

/** RMS of a 16-bit PCM frame below which audio counts as silence. Speech sits well above 1000. */
const SPEECH_RMS_THRESHOLD = 400;
/** Unbroken silence after which the browser stops uploading. Longer than the server's own grace. */
const CLIENT_SILENCE_MS = 30000;
/** Frames of silence held back so resuming carries the word's leading edge. */
const CLIENT_PREROLL_CHUNKS = 10;

interface RealtimeSocketProps {
  onSocketOpen?: () => void;
  onBibleMatch: (result: any) => void;
  onPartialTranscript?: (text: string, metadata?: {
    confidence?: number;
    serverReceivedAt?: number;
    clientReceivedAt: number;
    detectedReferences?: Array<{
      book: string;
      chapter: number;
      verse: number;
      formatted: string;
      start?: number;
      end?: number;
    }>;
  }) => void;
  onFinalTranscript?: (text: string) => void;
  onSleepCommand?: () => void;
  onWakeCommand?: () => void;
  onVersionChange?: (version: string) => void;
  onConnectionStatus?: (status: "idle" | "connecting" | "connected" | "disconnected") => void;
  onReferenceStage?: (data: {
    book: string;
    chapter: number;
    serverDetectedAt?: number;
  }) => void;
  onError?: (message: string) => void;
  onAudioStatus?: (status: "receiving" | "idle") => void;
  /**
   * The church is near, at, or past its monthly hours.
   *
   * "stopped" means the stream has already ended — the server closes the
   * socket after sending it, so this is a notification, not a chance to
   * intervene.
   */
  onAllowance?: (notice: {
    level: "warning" | "grace" | "stopped";
    message: string;
    remainingHours?: number;
    graceMinutes?: number;
    allowanceHours?: number;
    usedHours?: number;
  }) => void;
  /** QUOTE MODE (trial) */
  onVerseSuggestion?: (data: {
    seq: number;
    matchedVersion: string;
    candidate: {
      book: string;
      chapter: number;
      verse: number;
      verseEnd?: number;
      consecutiveWords: number;
      score: number;
      startsAtVerseStart: boolean;
      text: string;
      matchedText: string;
    };
    serverDetectedAt?: number;
  }) => void;
  onNavigation?: (
    commandType: string,
    direction: "next" | "previous" | undefined,
    targetVerse?: number,
    offset?: number,
    targetChapter?: number,
    serverTimestamp?: number,
  ) => void;
}

export const useRealtimeSocket = ({
  onBibleMatch,
  onPartialTranscript,
  onFinalTranscript,
  onSleepCommand,
  onWakeCommand,
  onVersionChange,
  onConnectionStatus,
  onReferenceStage,
  onSocketOpen,
  onError,
  onAudioStatus,
  onAllowance,
  onNavigation,
  onVerseSuggestion,
}: RealtimeSocketProps) => {
  const socketRef = useRef<WebSocket | null>(null);
  const pendingAudioRef = useRef<Int16Array[]>([]);
  const pendingControlRef = useRef<string[]>([]);
  const sentAudioChunksRef = useRef(0);
  // Voice-gate state: when the last speech was heard, whether upload is paused,
  // and the frames held back so a resume does not clip the opening word.
  const lastVoiceAtRef = useRef(Date.now());
  const gatedRef = useRef(false);
  const prerollRef = useRef<Int16Array[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Store callbacks in refs to avoid causing re-renders/re-creation of connect()
  const callbacks = useRef<RealtimeSocketProps>({
    onSocketOpen,
    onBibleMatch,
    onPartialTranscript,
    onFinalTranscript,
    onSleepCommand,
    onWakeCommand,
    onVersionChange,
    onConnectionStatus,
    onReferenceStage,
    onError,
    onAudioStatus,
  onAllowance,
    onNavigation,
    onVerseSuggestion,
  });

  // Update refs on every render
  useEffect(() => {
    callbacks.current = {
      onSocketOpen,
      onBibleMatch,
      onPartialTranscript,
      onFinalTranscript,
      onSleepCommand,
      onWakeCommand,
      onVersionChange,
      onConnectionStatus,
      onReferenceStage,
      onError,
      onAudioStatus,
  onAllowance,
      onNavigation,
      onVerseSuggestion,
    };
  });

  const connect = useCallback(() => {
    if (
      socketRef.current &&
      (socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const baseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';
    const wsUrl = `${baseUrl}/api/bible/audio-stream`;
    // The server now requires this token: streaming costs money per second, so
    // an unauthenticated socket is refused with code 4401.
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("[HFB Socket] No auth token — cannot open the voice service");
      callbacks.current.onError?.("Please sign in again to use hands-free Bible");
      return;
    }

    console.info("[HFB Socket] Connecting", { wsUrl });
    const ws = new WebSocket(`${wsUrl}?token=${encodeURIComponent(token)}`);

    ws.onopen = () => {
      if (socketRef.current !== ws) return; // released by disconnect() while connecting
      console.info("[HFB Socket][4/5] Browser WebSocket open", {
        wsUrl,
        queuedChunks: pendingAudioRef.current.length,
      });
      setIsConnected(true);
      callbacks.current.onSocketOpen?.();
      for (const message of pendingControlRef.current) ws.send(message);
      pendingControlRef.current = [];
      for (const chunk of pendingAudioRef.current) ws.send(chunk);
      pendingAudioRef.current = [];
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const cb = callbacks.current;

        switch (data.type) {
          case "transcript_partial":
            console.info("[HFB Socket][5/5] Partial transcript received", {
              text: data.text,
              confidence: data.confidence,
              detectedReferences: data.detectedReferences,
            });
            cb.onPartialTranscript?.(data.text, {
              confidence: data.confidence,
              serverReceivedAt: data.serverReceivedAt,
              clientReceivedAt: Date.now(),
              detectedReferences: data.detectedReferences,
            });
            break;
          case "transcript_final":
            console.info("[HFB Socket][5/5] Final transcript received", {
              text: data.text,
            });
            cb.onFinalTranscript?.(data.text);
            break;
          case "bible_match":
            cb.onBibleMatch?.(data);
            break;
          case "sleep_command":
            cb.onSleepCommand?.();
            break;
          case "wake_command":
            cb.onWakeCommand?.();
            break;
          case "version_change":
            cb.onVersionChange?.(data.requestedVersion);
            break;
          case "connection_status":
            console.info("[HFB Socket] Deepgram status", data.status);
            cb.onConnectionStatus?.(data.status);
            break;
          case "audio_status":
            console.info("[HFB Socket][4/5] Server confirmed PCM receipt", data);
            cb.onAudioStatus?.(data.status);
            break;
          case "navigation":
            cb.onNavigation?.(
              data.commandType,
              data.direction,
              data.targetVerse,
              data.offset,
              data.targetChapter,
              data.serverTimestamp || data.serverDetectedAt,
            );
            break;
          case "reference_stage":
            cb.onReferenceStage?.(data);
            break;
          case "verse_suggestion":
            cb.onVerseSuggestion?.(data);
            break;
          // The three allowance notices, in the order a church meets them:
          // running low, out but still running on grace, and stopped. They are
          // surfaced through one callback with a severity so a caller can pick
          // its own treatment without learning three message names.
          case "allowance_warning":
            console.warn("[RealtimeSocket] Allowance low:", data.message);
            cb.onAllowance?.({ level: "warning", message: data.message, ...data });
            break;
          case "allowance_exhausted":
            console.warn("[RealtimeSocket] Allowance spent, grace running:", data.message);
            cb.onAllowance?.({ level: "grace", message: data.message, ...data });
            break;
          case "allowance_blocked":
          case "allowance_stopped":
            console.error("[RealtimeSocket] Allowance enforced:", data.message);
            cb.onAllowance?.({ level: "stopped", message: data.message, ...data });
            break;
          case "error":
            console.error("[RealtimeSocket] Server error:", data.message);
            cb.onError?.(data.message || "Voice service error");
            break;
        }
      } catch (err) {
        console.error("[RealtimeSocket] Failed to parse message", err);
      }
    };

    ws.onclose = (event) => {
      console.log("[RealtimeSocket] Disconnected from server", { code: event.code });
      // A socket released by disconnect() closes up to 500ms later; by then a
      // newer socket may be current and must not be cleared.
      if (socketRef.current !== ws) return;
      // The server refuses a stream it cannot bill or cannot trust, and ends one
      // that has run past the session ceiling. Each needs its own message.
      if (event.code === 4401) {
        callbacks.current.onError?.("Your session expired. Please sign in again.");
      } else if (event.code === 4403) {
        callbacks.current.onError?.("This app is not allowed to use the voice service.");
      } else if (event.code === 4408) {
        callbacks.current.onError?.("Voice session ended after reaching its time limit. Start it again to continue.");
      }
      setIsConnected(false);
      socketRef.current = null;
    };

    ws.onerror = (err) => {
      // Closing a released socket that was still connecting fires "error" in
      // the browser. That's expected teardown, not a failure to report.
      if (socketRef.current !== ws) return;
      console.error("[RealtimeSocket] WebSocket Error:", err);
      callbacks.current.onError?.("Unable to connect to voice service");
    };

    socketRef.current = ws;
  }, []);

  const disconnect = useCallback(() => {
    const socketToClose = socketRef.current;
    // Release it now so an immediate connect() (remount, page change) opens a
    // fresh socket instead of seeing this one as open and doing nothing.
    socketRef.current = null;
    if (socketToClose) {
      // Small delay to let final bits transmit
      setTimeout(() => {
        if (socketToClose.readyState === WebSocket.OPEN || socketToClose.readyState === WebSocket.CONNECTING) {
          socketToClose.close();
        }
      }, 500);
    }
    pendingAudioRef.current = [];
    pendingControlRef.current = [];
    sentAudioChunksRef.current = 0;
    prerollRef.current = [];
    gatedRef.current = false;
    lastVoiceAtRef.current = Date.now();
    setIsConnected(false);
  }, []);

  const sendPCMData = useCallback((pcmBuffer: Int16Array) => {
    // ── Voice gate ────────────────────────────────────────────────────────
    // Every frame sent is a frame Deepgram bills, and an open microphone in a
    // quiet room produces them continuously. The server gates as well, so this
    // is deliberately conservative: it only stops after a long unbroken stretch
    // of quiet, and it holds a pre-roll so resuming never clips the first word.
    let sumSquares = 0;
    for (let i = 0; i < pcmBuffer.length; i += 1) {
      sumSquares += pcmBuffer[i] * pcmBuffer[i];
    }
    const rms = pcmBuffer.length ? Math.sqrt(sumSquares / pcmBuffer.length) : 0;
    const now = Date.now();

    if (rms >= SPEECH_RMS_THRESHOLD) {
      lastVoiceAtRef.current = now;
      if (gatedRef.current) {
        gatedRef.current = false;
        console.info("[HFB Socket] Voice resumed — streaming again");
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          for (const held of prerollRef.current) socketRef.current.send(held);
        }
      }
      prerollRef.current = [];
    } else if (gatedRef.current) {
      prerollRef.current.push(pcmBuffer.slice());
      if (prerollRef.current.length > CLIENT_PREROLL_CHUNKS) prerollRef.current.shift();
      return;
    } else if (now - lastVoiceAtRef.current >= CLIENT_SILENCE_MS) {
      gatedRef.current = true;
      prerollRef.current = [];
      console.info(`[HFB Socket] ${Math.round((now - lastVoiceAtRef.current) / 1000)}s of silence — pausing upload`);
      return;
    }

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(pcmBuffer);
      sentAudioChunksRef.current += 1;
      if (sentAudioChunksRef.current === 1 || sentAudioChunksRef.current % 25 === 0) {
        console.info("[HFB Socket][4/5] PCM sent to server", {
          chunk: sentAudioChunksRef.current,
          samples: pcmBuffer.length,
          bytes: pcmBuffer.byteLength,
          bufferedAmount: socketRef.current.bufferedAmount,
        });
      }
    } else if (socketRef.current?.readyState === WebSocket.CONNECTING) {
      // Preserve at most one second of 20ms chunks so the first spoken words
      // are not lost while the warm connection finishes opening.
      pendingAudioRef.current.push(pcmBuffer.slice());
      if (pendingAudioRef.current.length > 50) pendingAudioRef.current.shift();
    } else {
      console.warn("[HFB Socket] PCM dropped because socket is not open", {
        readyState: socketRef.current?.readyState ?? "no socket",
      });
    }
  }, []);

  const setStrictMode = useCallback((strict: boolean) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "set_strict_mode", strictMode: strict }));
    }
  }, []);

  const setBibleVersion = useCallback((version: string) => {
    const message = JSON.stringify({
      type: "set_bible_version",
      version: version.toLowerCase(),
    });
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(message);
    } else {
      pendingControlRef.current.push(message);
    }
  }, []);

  const setBibleContext = useCallback((context: {
    book: string;
    chapter: number;
    verse: number;
  }) => {
    const message = JSON.stringify({ type: "set_bible_context", ...context });
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(message);
    } else {
      pendingControlRef.current.push(message);
    }
  }, []);

  /** QUOTE MODE (trial): tell the server whether to run the KJV quote matcher. */
  const setHfbSubMode = useCallback((mode: "reference" | "quote") => {
    const message = JSON.stringify({ type: "set_hfb_sub_mode", mode });
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(message);
    } else {
      pendingControlRef.current.push(message);
    }
  }, []);

  const beginSessionTrace = useCallback((clientClickAt: number) => {
    const message = JSON.stringify({
      type: "hfb_trace_start",
      traceId: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      clientClickAt,
    });
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(message);
    } else {
      pendingControlRef.current.push(message);
    }
  }, []);

  return {
    isConnected,
    connect,
    disconnect,
    sendPCMData,
    setStrictMode,
    setBibleVersion,
    setBibleContext,
    beginSessionTrace,
    setHfbSubMode,
  };
};
