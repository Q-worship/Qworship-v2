import { useState, useRef, useCallback, useEffect } from "react";

interface RealtimeSocketProps {
  onBibleMatch: (result: any) => void;
  onPartialTranscript?: (text: string, metadata?: {
    confidence?: number;
    serverReceivedAt?: number;
    clientReceivedAt: number;
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
  onAudioStatus?: (status: "receiving") => void;
  onNavigation?: (
    commandType: string,
    direction: "next" | "previous" | undefined,
    targetVerse?: number,
    offset?: number,
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
  onError,
  onAudioStatus,
  onNavigation,
}: RealtimeSocketProps) => {
  const socketRef = useRef<WebSocket | null>(null);
  const pendingAudioRef = useRef<Int16Array[]>([]);
  const pendingControlRef = useRef<string[]>([]);
  const sentAudioChunksRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);

  // Store callbacks in refs to avoid causing re-renders/re-creation of connect()
  const callbacks = useRef<RealtimeSocketProps>({
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
    onNavigation,
  });

  // Update refs on every render
  useEffect(() => {
    callbacks.current = {
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
      onNavigation,
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

    console.info("[HFB Socket] Connecting", { wsUrl });
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.info("[HFB Socket][4/5] Browser WebSocket open", {
        wsUrl,
        queuedChunks: pendingAudioRef.current.length,
      });
      setIsConnected(true);
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
            });
            cb.onPartialTranscript?.(data.text, {
              confidence: data.confidence,
              serverReceivedAt: data.serverReceivedAt,
              clientReceivedAt: Date.now(),
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
            );
            break;
          case "reference_stage":
            cb.onReferenceStage?.(data);
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

    ws.onclose = () => {
      console.log("[RealtimeSocket] Disconnected from server");
      setIsConnected(false);
      socketRef.current = null;
    };

    ws.onerror = (err) => {
      console.error("[RealtimeSocket] WebSocket Error:", err);
      callbacks.current.onError?.("Unable to connect to voice service");
    };

    socketRef.current = ws;
  }, []);

  const disconnect = useCallback(() => {
    const socketToClose = socketRef.current;
    if (socketToClose) {
      // Small delay to let final bits transmit
      setTimeout(() => {
        if (socketToClose.readyState === WebSocket.OPEN || socketToClose.readyState === WebSocket.CONNECTING) {
          socketToClose.close();
        }
        if (socketRef.current === socketToClose) {
          socketRef.current = null;
        }
      }, 500);
    }
    pendingAudioRef.current = [];
    pendingControlRef.current = [];
    sentAudioChunksRef.current = 0;
    setIsConnected(false);
  }, []);

  const sendPCMData = useCallback((pcmBuffer: Int16Array) => {
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
    beginSessionTrace,
  };
};
