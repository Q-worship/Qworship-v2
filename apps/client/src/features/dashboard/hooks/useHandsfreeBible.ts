import React, {
  useState,
  useEffect,
  useRef,
  MutableRefObject,
  useCallback,
} from "react";
import { useDisplayModeStore } from "@/stores/useDisplayModeStore";
import { useBibleProjectionStore } from "@/stores/useBibleProjectionStore";
import { useRealtimeSocket } from "@/hooks/useRealtimeSocket";
import { useRawAudioStream } from "@/hooks/useRawAudioStream";
import { useToast } from "@/hooks/use-toast";
import { resolveCachedHFBVerse, useHFBStore } from "./useHFBStore";
import { apiClient } from "@/lib/api";
import { parseHFBReference } from "../lib/hfbFastReferenceParser";

interface UseHandsfreeBibleProps {
  liveWindow: Window | null;
  handsfreeBibleButtonRef: MutableRefObject<HTMLElement | null>;
}

export const useHandsfreeBible = ({
  liveWindow,
  handsfreeBibleButtonRef,
}: UseHandsfreeBibleProps) => {
  const { toast } = useToast();
  const setHfbConnectionStatus = useHFBStore(
    (state) => state.setHfbConnectionStatus,
  );
  // Store actions
  const { setMode: setDisplayMode } = useDisplayModeStore();
  const {
    setVerse: setZustandVerse,
    setBibleVersion: setZustandBibleVersion,
    clearProjection: clearZustandProjection,
  } = useBibleProjectionStore();

  // Hands-free Bible widget state
  const [isHandsfreeBibleOpen, setIsHandsfreeBibleOpen] = useState(false);
  const [selectedBibleVersion, setSelectedBibleVersion] = useState("KJV");
  const [detectedCommands, setDetectedCommands] = useState(
    "No commands detected",
  );
  const [widgetPosition, setWidgetPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [microphoneStatus, setMicrophoneStatus] = useState("Idle");

  const [hasBeenDragged, setHasBeenDragged] = useState(false);
  const [isWidgetVisible, setIsWidgetVisible] = useState(false);
  const [isListeningMode, setIsListeningMode] = useState(false);
  const [isVoiceConnecting, setIsVoiceConnecting] = useState(false);
  const [isAudioStreaming, setIsAudioStreaming] = useState(false);
  const [isSleepMode, setIsSleepMode] = useState(false);

  // Multi-version verse data for widget display
  const [widgetVerseData, setWidgetVerseData] = useState<
    | {
        verse: number;
        kjv: string;
        nkjv: string;
        amp: string;
        msg: string;
        esv: string;
        niv: string;
      }[]
    | null
  >(null);
  const [widgetFormattedReference, setWidgetFormattedReference] = useState<
    string | null
  >(null);

  // Refs to avoid stale closures
  const currentVerseContextRef = useRef<{
    book: string;
    chapter: number;
    verse: number;
  } | null>(null);
  const liveWindowRef = useRef<Window | null>(null);
  // QC64: Keep a synchronous ref to the selected version so that onVersionChange
  // can pass the NEW version to executeNavigation immediately, before the React
  // state setter (setSelectedBibleVersion) has had a chance to flush.
  const selectedBibleVersionRef = useRef<string>("KJV");
  const lastProjectedRef = useRef<{ key: string; at: number }>({ key: "", at: 0 });
  const pendingInterimRef = useRef<{ key: string; count: number; at: number; firstSeenAt: number }>({
    key: "", count: 0, at: 0, firstSeenAt: 0,
  });
  const voiceReadyRef = useRef(false);
  const connectionAttemptRef = useRef(0);
  const preReadyAudioChunksRef = useRef(0);

  useEffect(() => {
    liveWindowRef.current = liveWindow;
  }, [liveWindow]);

  // QC64: Keep selectedBibleVersionRef in sync with the React state so that
  // executeNavigation always reads the latest version even when changed via UI.
  useEffect(() => {
    selectedBibleVersionRef.current = selectedBibleVersion;
  }, [selectedBibleVersion]);

  // Handle Socket Events
  const handleBibleMatch = (data: any, overrideVersion?: string) => {
    if (data.success === false) {
      setDetectedCommands(data.error || "Command not recognized");
      return;
    }

    const { book, chapter, verses } = data.result;
    const verseData = verses?.[0];
    const verseNum = verseData?.verse;

    if (data.commandType === "version_change" && data.requestedVersion) {
      const newVersion = data.requestedVersion.toUpperCase();
      setSelectedBibleVersion(newVersion);
    }

    // QC64 fix: Use overrideVersion if provided (version-switch re-projection),
    // then fall back to requestedVersion (direct version_change from server),
    // then use the synchronous ref (always current, unlike selectedBibleVersion state).
    const effectiveVersion = (
      overrideVersion ||
      (data.commandType === "version_change" && data.requestedVersion
        ? data.requestedVersion
        : null) ||
      selectedBibleVersionRef.current
    ).toUpperCase();
    const versionKey = effectiveVersion.toLowerCase();
    const text = verseData?.[versionKey] || "";
    const projectionKey = `${versionKey}|${book}|${chapter}|${verseNum}`;
    const now = performance.now();
    if (projectionKey === lastProjectedRef.current.key &&
        now - lastProjectedRef.current.at < 5000) {
      return;
    }
    if (!text.trim()) {
      console.warn(`[HFB] ${effectiveVersion} text is unavailable for ${book} ${chapter}:${verseNum}`);
      return;
    }
    lastProjectedRef.current = { key: projectionKey, at: now };

    const currentVerseContext = { book, chapter, verse: verseNum };
    currentVerseContextRef.current = currentVerseContext;
    setWidgetVerseData(verses || null);
    setWidgetFormattedReference(`${book} ${chapter}:${verseNum}`);
    setDetectedCommands(`${book} ${chapter}:${verseNum}`);

    const verseForStore = verseData
      ? {
          book,
          chapter,
          verse: verseNum,
          kjv: verseData.kjv,
          nkjv: verseData.nkjv,
          niv: verseData.niv,
          amp: verseData.amp,
          gn: verseData.gn,
          msg: verseData.msg,
          esv: verseData.esv,
        }
      : null;
    setZustandVerse(verseForStore, `${book} ${chapter}:${verseNum}`);
    setZustandBibleVersion(effectiveVersion);

    // Integrate with HFB layout store
    const detectedId = Date.now();
    useHFBStore.getState().addHfbDetectedVerse({
      id: detectedId,
      reference: `${book} ${chapter}:${verseNum}`,
      verseText: text,
      version: effectiveVersion,
      isActive: true,
      verseNum: verseNum,
      book,
      chapter
    });
    
    // Set all other detected verses to inactive
    useHFBStore.getState().setHfbDetectedVerses(prev => 
      prev.map(d => ({ ...d, isActive: d.id === detectedId }))
    );
    useHFBStore.getState().setHfbCurrentProjected({ reference: `${book} ${chapter}:${verseNum}`, text, version: effectiveVersion });
    
    // Asynchronously fetch and display the whole chapter in Center Stage
    useHFBStore.getState().fetchHFBChapter(book, chapter, effectiveVersion, verseNum);

    if (isHandsfreeBibleOpen) {
      setDisplayMode("hfb-bible");
    }

    const currentLiveWindow = liveWindowRef.current;
    if (currentLiveWindow && !currentLiveWindow.closed) {
      currentLiveWindow.postMessage(
        {
          type: "BIBLE_VERSE_DISPLAY",
          data: {
            book,
            chapter,
            verse: verseNum,
            text,
            version: effectiveVersion,
            reference: `${book} ${chapter}:${verseNum}`,
          },
        },
        window.location.origin,
      );
    }

    const telemetry = data.telemetry || {};
    const projectedAt = Date.now();
    const latency = {
      source: telemetry.source || "server",
      serverLookupMs: telemetry.serverLookupMs,
      serverToClientMs: telemetry.serverResolvedAt
        ? projectedAt - telemetry.serverResolvedAt
        : undefined,
      clientProjectionMs: telemetry.clientStartedAt
        ? projectedAt - telemetry.clientStartedAt
        : undefined,
      projectedAt,
      reference: `${book} ${chapter}:${verseNum}`,
    };
    console.info("[HFB Latency]", latency);
    const measuredLatency = latency.clientProjectionMs ?? latency.serverToClientMs;
    if (typeof measuredLatency === "number") {
      useHFBStore.getState().setHfbLatency(measuredLatency, latency.source);
    }
    window.dispatchEvent(new CustomEvent("qworship:hfb-latency", { detail: latency }));
  };

  const processInterimLocally = async (
    text: string,
    metadata?: { confidence?: number; serverReceivedAt?: number; clientReceivedAt: number },
  ) => {
    const parseStarted = performance.now();
    const parsed = parseHFBReference(text);
    if (!parsed) return;
    const version = selectedBibleVersionRef.current.toUpperCase();
    const key = `${version}|${parsed.book}|${parsed.chapter}|${parsed.verse}`;
    const now = performance.now();
    const previous = pendingInterimRef.current;
    const sameCandidate = previous.key === key && now - previous.at < 1500;
    const count = sameCandidate ? previous.count + 1 : 1;
    const firstSeenAt = sameCandidate ? previous.firstSeenAt || previous.at : now;
    pendingInterimRef.current = { key, count, at: now, firstSeenAt };

    const strictMode = useHFBStore.getState().hfbStrictMode;
    const confidence = metadata?.confidence ?? 0;
    const hasStrictCue =
      /\b(?:bible|show|project|display|open|turn\s+to|go\s+to|read(?:\s+from)?)\b/i.test(text);
    if (strictMode && !hasStrictCue) return;

    // Clear, complete references project on their first high-confidence
    // interim. Medium-confidence references need one matching confirmation.
    // Low-confidence hypotheses never control the live presentation.
    const requiredResults = confidence >= 0.85 ? 1 : confidence >= 0.65 ? 2 : Infinity;
    if (
      count < requiredResults ||
      (lastProjectedRef.current.key === key && now - lastProjectedRef.current.at < 5000)
    ) return;

    const cached = await resolveCachedHFBVerse(
      parsed.book, parsed.chapter, parsed.verse, version,
    );
    if (!cached) return; // Server RAM result remains the reliable fallback.

    const versionKey = version.toLowerCase();
    handleBibleMatch({
      commandType: "lookup",
      result: {
        book: parsed.book,
        chapter: parsed.chapter,
        verses: [{ verse: parsed.verse, [versionKey]: cached.text }],
      },
      telemetry: {
        source: `client-${cached.source}`,
        clientStartedAt: metadata?.clientReceivedAt || Date.now(),
        parserMs: performance.now() - parseStarted,
      },
    }, version);
  };

  const executeNavigation = async (
    commandType: string,
    direction: "next" | "previous" | undefined,
    targetVerse?: number,
    offset?: number,
    overrideVersion?: string,  // QC64: explicit version override for version-switch re-projection
  ) => {
    let commandText = "";
    if (commandType === "chapter_change") {
      commandText = direction
        ? `${direction === "next" ? "Next" : "Previous"} chapter`
        : "Change chapter";
    } else if (commandType === "verse_change") {
      commandText = direction
        ? `${direction === "next" ? "Next" : "Previous"} verse`
        : "Change verse";
    } else if (commandType === "jump_to_verse") {
      commandText = `Jump to verse ${targetVerse}`;
    } else if (commandType === "last_verse") {
      commandText = `Last verse`;
    } else if (commandType === "jump_relative") {
      commandText = `Jump ${offset! > 0 ? `forward ${offset}` : `back ${-offset!}`} verses`;
    }

    setDetectedCommands(commandText);

    // We need to fetch the next/previous verse using the current context
    const currentContext = currentVerseContextRef.current;
    console.log("[HandsfreeBible] executeNavigation triggered", {
      commandType,
      direction,
      targetVerse,
      offset,
      currentContext,
    });

    if (
      !currentContext ||
      !currentContext.book ||
      !currentContext.chapter ||
      !currentContext.verse
    ) {
      console.warn("[HandsfreeBible] No current verse context for navigation");
      return;
    }

    console.log(
      "[HandsfreeBible] Fetching from API with context:",
      currentContext,
    );
    try {
      const response = await apiClient.post("/bible/voice-command", {
          text: commandText,
          currentBook: currentContext.book,
          currentChapter: currentContext.chapter,
          currentVerse: currentContext.verse,
          currentVersion:
            overrideVersion?.toLowerCase() ||
            (currentContext as any).version ||
            selectedBibleVersionRef.current.toLowerCase(),
          commandType,
          direction,
          targetVerse,
          offset,
      });

      console.log("[HandsfreeBible] Fetch status:", response.status);
      if (response.status >= 200 && response.status < 300) {
        const data = response.data;
        console.log("[HandsfreeBible] Navigation API response:", data);
        if (data.success && data.result) {
          // QC64 fix: Pass overrideVersion so handleBibleMatch uses the correct
          // version key when looking up text (avoids stale selectedBibleVersion state).
          handleBibleMatch({
            result: data.result,
            commandType: data.commandType,
          }, overrideVersion);
        } else {
          console.warn("[HandsfreeBible] Navigation failed:", data.error);
        }
      } else {
        console.error(
          "[HandsfreeBible] Navigation fetch failed. Status:",
          response.status,
        );
        const errorText = await response.text();
        console.error("[HandsfreeBible] Error body:", errorText);
      }
    } catch (error) {
      console.error(
        "[HandsfreeBible] Error executing navigation command:",
        error,
      );
    }
  };

  const {
    isRecording, volume, startRecording, stopRecording,
  } =
    useRawAudioStream();

  // Inactivity Timer
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  const resetInactivityTimer = useCallback(() => {
    clearInactivityTimer();
    inactivityTimerRef.current = setTimeout(() => {
      setIsListeningMode(false);
      setIsSleepMode(false);
      stopRecording();
      setMicrophoneStatus("Idle");
      setDetectedCommands("Stopped listening due to inactivity");
    }, INACTIVITY_TIMEOUT_MS);
  }, [clearInactivityTimer, stopRecording]);

  const { connect, disconnect, sendPCMData, isConnected, setStrictMode } = useRealtimeSocket({
    onBibleMatch: (data: any) => {
      resetInactivityTimer();
      handleBibleMatch(data);
    },
    onPartialTranscript: (text, metadata) => {
      resetInactivityTimer();
      setMicrophoneStatus("Processing");
      useHFBStore.getState().setHfbCurrentPartial(text);
      void processInterimLocally(text, metadata);
    },
    onFinalTranscript: (text) => {
      resetInactivityTimer();
      setMicrophoneStatus("Listening");
      useHFBStore.getState().setHfbCurrentPartial(""); // Clear partial when final arrives
      if (text.trim()) {
        useHFBStore.getState().addHfbTranscriptLine({
          id: Date.now(),
          text,
          ts: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
        });
      }
    },
    onSleepCommand: () => {
      resetInactivityTimer();
      setIsSleepMode(true);
      setMicrophoneStatus("Sleeping");
      setDetectedCommands(`Sleeping... Say "Bible" or "I'm ready" to wake`);
    },
    onWakeCommand: () => {
      resetInactivityTimer();
      setIsSleepMode(false);
      setMicrophoneStatus("Listening");
      setDetectedCommands("Awake! Listening for commands...");
    },
    onVersionChange: (version) => {
      resetInactivityTimer();
      const normalized = version.toUpperCase();
      // QC64: Update the synchronous ref FIRST so executeNavigation reads the
      // new version immediately (React state setter is async and won't flush
      // until the next render cycle).
      selectedBibleVersionRef.current = normalized;
      setSelectedBibleVersion(normalized);
      setZustandBibleVersion(normalized);
      setDetectedCommands(`Switched to ${normalized}`);

      // Re-project the current verse in the new version
      const ctx = currentVerseContextRef.current;
      if (ctx && ctx.book && ctx.chapter && ctx.verse) {
        console.log(`[HandsfreeBible] Auto-refreshing ${ctx.book} ${ctx.chapter}:${ctx.verse} in ${normalized}`);
        // Pass normalized as overrideVersion so the API call uses the new version,
        // not the stale selectedBibleVersion React state value.
        executeNavigation("jump_to_verse", undefined, ctx.verse, undefined, normalized);
      }
    },
    onNavigation: (commandType, direction, targetVerse, offset) => {
      resetInactivityTimer();
      executeNavigation(commandType, direction, targetVerse, offset);
    },
    onReferenceStage: ({ book, chapter }) => {
      // Predictively hydrate the chapter while the speaker is still saying the
      // verse number. This makes the eventual lookup a synchronous RAM hit.
      void useHFBStore.getState().fetchHFBChapter(
        book, chapter, selectedBibleVersionRef.current,
      );
    },
    onError: (message) => {
      connectionAttemptRef.current += 1;
      voiceReadyRef.current = false;
      setIsVoiceConnecting(false);
      setIsListeningMode(false);
      setIsAudioStreaming(false);
      stopRecording();
      setHfbConnectionStatus("disconnected");
      setMicrophoneStatus("Voice connection failed");
      setDetectedCommands(message);
      toast({
        title: "Voice connection failed",
        description: message,
        variant: "destructive",
      });
    },
    onConnectionStatus: (status) => {
      if (status === "connecting") {
        voiceReadyRef.current = false;
        setHfbConnectionStatus(isListeningMode ? "reconnecting" : "connecting");
        setMicrophoneStatus(isListeningMode ? "Reconnecting voice..." : "Connecting voice...");
      } else if (status === "connected") {
        voiceReadyRef.current = true;
        setHfbConnectionStatus("ready");
        setMicrophoneStatus(isListeningMode ? "Listening" : "Voice ready");
      } else if (status === "disconnected") {
        voiceReadyRef.current = false;
        setHfbConnectionStatus(isListeningMode ? "reconnecting" : "disconnected");
        setMicrophoneStatus(isListeningMode ? "Reconnecting voice..." : "Disconnected");
      }
    },
    onAudioStatus: () => {
      setIsAudioStreaming(true);
      setMicrophoneStatus("Listening");
    },
  });

  const hfbStrictMode = useHFBStore((state) => state.hfbStrictMode);

  // Sync strict mode to the backend
  useEffect(() => {
    if (isConnected) {
      setStrictMode(hfbStrictMode);
    }
  }, [isConnected, hfbStrictMode, setStrictMode]);

  // Position recalculation on resize (only if not dragged)
  useEffect(() => {
    const handleResize = () => {
      if (isHandsfreeBibleOpen && !hasBeenDragged) {
        setWidgetPosition(calculateInitialPosition());
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isHandsfreeBibleOpen, hasBeenDragged]);

  // Handle socket connection lifecycle
  useEffect(() => {
    if (isHandsfreeBibleOpen && !isConnected) {
      connect();
    }
  }, [isHandsfreeBibleOpen, connect, isConnected]);

  // Clean up socket on unmount ONLY
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Sync state to local storage and live window
  useEffect(() => {
    const widgetState = {
      isOpen: isHandsfreeBibleOpen,
      isListeningMode,
      selectedBibleVersion,
      detectedCommands,
    };
    localStorage.setItem("handsfreeBibleState", JSON.stringify(widgetState));

    if (liveWindow && !liveWindow.closed) {
      liveWindow.postMessage(
        {
          type: "BIBLE_WIDGET_SYNC",
          data: widgetState,
        },
        window.location.origin,
      );
    }
  }, [
    isHandsfreeBibleOpen,
    isListeningMode,
    selectedBibleVersion,
    detectedCommands,
    liveWindow,
  ]);

  // Sync dragging coordinates
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setWidgetPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    setHasBeenDragged(true);
    setDragOffset({
      x: e.clientX - widgetPosition.x,
      y: e.clientY - widgetPosition.y,
    });
  };

  const calculateInitialPosition = () => {
    if (handsfreeBibleButtonRef.current) {
      const rect = handsfreeBibleButtonRef.current.getBoundingClientRect();
      const WIDGET_WIDTH = 400;
      let leftPosition = rect.left + rect.width / 2 - WIDGET_WIDTH / 2;
      if (leftPosition < 20) leftPosition = 20;
      if (leftPosition + WIDGET_WIDTH > window.innerWidth - 20) {
        leftPosition = window.innerWidth - WIDGET_WIDTH - 20;
      }
      return {
        x: leftPosition,
        y: rect.bottom + 15,
      };
    }
    return { x: window.innerWidth / 2 - 200, y: 100 };
  };

  const toggleHandsfreeBible = () => {
    const newState = !isHandsfreeBibleOpen;

    if (newState) {
      const initialPosition = calculateInitialPosition();
      setWidgetPosition(initialPosition);
      setHasBeenDragged(false);
      setIsSleepMode(false);
      setIsHandsfreeBibleOpen(true);
      setIsWidgetVisible(false);

      setTimeout(() => {
        setIsWidgetVisible(true);
      }, 20);
    } else {
      setIsHandsfreeBibleOpen(false);
      setIsWidgetVisible(false);
      setHasBeenDragged(false);

      setDetectedCommands("No commands detected");
      currentVerseContextRef.current = null;
      setWidgetVerseData(null);
      clearZustandProjection();
      useHFBStore.getState().clearAllState();

      // Stop recording and disconnect
      stopRecording();
      clearInactivityTimer();
      disconnect();
      setIsListeningMode(false);
      setIsAudioStreaming(false);
      setIsSleepMode(true);
    }

    if (liveWindow && !liveWindow.closed) {
      liveWindow.postMessage(
        {
          type: "BIBLE_WIDGET_TOGGLE",
          data: { isOpen: newState },
        },
        window.location.origin,
      );
    }
  };

  const toggleMicrophone = async () => {
    if (isListeningMode || isVoiceConnecting) {
      connectionAttemptRef.current += 1;
      setIsListeningMode(false);
      setIsVoiceConnecting(false);
      setIsSleepMode(false);
      setIsAudioStreaming(false);
      stopRecording();
      clearInactivityTimer();
      setMicrophoneStatus("Idle");
      setDetectedCommands("Stopped listening");
    } else {
      const attemptId = ++connectionAttemptRef.current;
      setIsSleepMode(false);
      setIsVoiceConnecting(true);
      setMicrophoneStatus("Requesting microphone...");
      setDetectedCommands("Preparing microphone and voice service…");
      setHfbConnectionStatus("connecting");
      if (!isConnected) connect();

      try {
        // Acquire/resume browser audio directly from the user gesture. Audio is
        // intentionally discarded until Deepgram confirms that it is ready.
        await startRecording((pcmBuffer) => {
          if (voiceReadyRef.current) {
            sendPCMData(pcmBuffer);
          } else {
            preReadyAudioChunksRef.current += 1;
            if (preReadyAudioChunksRef.current === 1) {
              console.info(
                "[HFB Audio] PCM is flowing but waiting for Deepgram ready before sending",
              );
            }
          }
        });
        if (connectionAttemptRef.current !== attemptId) {
          stopRecording();
          return;
        }
        setMicrophoneStatus("Connecting voice...");
        const readyDeadline = Date.now() + 10000;
        while (!voiceReadyRef.current && Date.now() < readyDeadline &&
               connectionAttemptRef.current === attemptId) {
          await new Promise(resolve => window.setTimeout(resolve, 50));
        }
        if (connectionAttemptRef.current !== attemptId) return;
        if (!voiceReadyRef.current) {
          stopRecording();
          throw new Error("Voice connection timed out");
        }
        setIsVoiceConnecting(false);
        setIsListeningMode(true);
        setMicrophoneStatus("Checking microphone audio...");
        setDetectedCommands("Voice connected — checking microphone audio…");
        setHfbConnectionStatus("ready");
        resetInactivityTimer();
      } catch (err) {
        setIsVoiceConnecting(false);
        setIsListeningMode(false);
        setMicrophoneStatus("Error");
        setDetectedCommands("Failed to access microphone");
        toast({
          title: "Microphone Error",
          description: "Please allow microphone access to use voice commands.",
          variant: "destructive",
        });
      }
    }
  };

  return {
    isHandsfreeBibleOpen,
    isWidgetVisible,
    widgetPosition,
    isDragging,
    isListeningMode,
    isVoiceConnecting,
    isAudioStreaming,
    isSleepMode,
    microphoneStatus,
    detectedCommands,
    selectedBibleVersion,
    widgetVerseData,
    widgetFormattedReference,
    volume,
    toggleHandsfreeBible,
    toggleMicrophone,
    setSelectedBibleVersion,
    handleDragStart,
    setIsListeningMode,
    setDetectedCommands,
    executeNavigation,
  };
};
