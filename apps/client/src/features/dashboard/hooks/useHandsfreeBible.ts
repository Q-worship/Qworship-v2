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
import { resolveHFBVerse, useHFBStore } from "./useHFBStore";
import { useLiveConsoleStore } from "./useLiveConsoleStore";
import { apiClient } from "@/lib/api";
import {
  parseHFBContextNavigation,
  parseHFBReference,
  scanHFBContextNavigations,
} from "../lib/hfbFastReferenceParser";
import { parseBibleVersionCommand } from "../data/bibleTranslations";
import { useBibleRAMCache } from "./useBibleRAMCache";
import { useHFBQuoteMode } from "./useHFBQuoteMode"; // QUOTE MODE (trial)
import { db } from "@/lib/db";

interface UseHandsfreeBibleProps {
  liveWindow: Window | null;
  handsfreeBibleButtonRef: MutableRefObject<HTMLElement | null>;
  isPanelActive?: boolean;
}

export const useHandsfreeBible = ({
  liveWindow,
  handsfreeBibleButtonRef,
  isPanelActive = false,
}: UseHandsfreeBibleProps) => {
  const isLeftPanelHfbActive = useLiveConsoleStore(
    (state) => state.leftPanelTab === "hfb",
  );
  const effectivePanelActive = isPanelActive || isLeftPanelHfbActive;

  const { toast } = useToast();
  const setHfbConnectionStatus = useHFBStore(
    (state) => state.setHfbConnectionStatus,
  );
  const hfbVersion = useHFBStore((state) => state.hfbVersion);
  const loadHfbPreferences = useHFBStore((state) => state.loadHfbPreferences);
  // Store actions
  const { setMode: setDisplayMode } = useDisplayModeStore();
  const {
    currentVerse: projectedBibleVerse,
    setVerse: setZustandVerse,
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
  const lastProjectedRef = useRef<{ key: string; at: number }>({
    key: "",
    at: 0,
  });
  const pendingInterimRef = useRef<{
    key: string;
    count: number;
    at: number;
    firstSeenAt: number;
  }>({
    key: "",
    count: 0,
    at: 0,
    firstSeenAt: 0,
  });
  const voiceReadyRef = useRef(false);
  const connectionAttemptRef = useRef(0);
  const listeningRequestedAtRef = useRef(0);
  const firstPartialSeenRef = useRef(false);
  const lastContextNavigationRef = useRef<{ key: string; at: number }>({
    key: "",
    at: 0,
  });
  const executedContextNavigationsRef = useRef<Set<string>>(new Set());
  const executedRelativeNavigationsRef = useRef<Set<string>>(new Set());
  const executedTurnReferencesRef = useRef<Set<string>>(new Set());
  const isNewUtteranceRef = useRef<boolean>(true);
  const consumedCursorIndexRef = useRef<number>(0);
  const lastParsedOffsetRef = useRef<number>(0);
  const lastTranscriptTextRef = useRef<string>("");
  const localLookupSequenceRef = useRef(0);
  const lastServerProjectionSequenceRef = useRef(0);
  const lastServerProjectionAtRef = useRef(0);
  const projectionGenerationRef = useRef(0);
  const lastProjectionTimestampRef = useRef(0);
  const navigationRequestSequenceRef = useRef(0);
  const executeNavigationRef = useRef<
    (
      commandType: string,
      direction?: string,
      targetVerse?: number,
      offset?: number,
      overrideVersion?: string,
      targetChapter?: number,
    ) => Promise<void>
  >(async () => undefined);

  useEffect(() => {
    liveWindowRef.current = liveWindow;
  }, [liveWindow]);

  // QC64: Keep selectedBibleVersionRef in sync with the React state so that
  // executeNavigation always reads the latest version even when changed via UI.
  useEffect(() => {
    selectedBibleVersionRef.current = selectedBibleVersion;
  }, [selectedBibleVersion]);

  useEffect(() => {
    const normalized = hfbVersion.toUpperCase();
    if (selectedBibleVersionRef.current === normalized) return;
    selectedBibleVersionRef.current = normalized;
    setSelectedBibleVersion(normalized);
  }, [hfbVersion]);

  useEffect(() => {
    if (isHandsfreeBibleOpen || effectivePanelActive) {
      void loadHfbPreferences();
    }
  }, [isHandsfreeBibleOpen, effectivePanelActive, loadHfbPreferences]);

  // Handle Socket Events
  const handleBibleMatch = (data: any, overrideVersion?: string) => {
    if (data.success === false) {
      setDetectedCommands(data.error || "Command not recognized");
      return;
    }

    if (Number.isFinite(data.projectionSequence)) {
      const incomingSequence = Number(data.projectionSequence);
      if (incomingSequence <= lastServerProjectionSequenceRef.current) {
        console.info(
          `[HFB] Stale server projection suppressed: ${incomingSequence}`,
        );
        return;
      }
      lastServerProjectionSequenceRef.current = incomingSequence;
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
    const text = verseData?.[versionKey] || verseData?.text || "";
    const projectionKey = `${versionKey}|${book}|${chapter}|${verseNum}`;
    const now = performance.now();

    // A reference may arrive from local prediction, a server interim, and the
    // final transcript. Once it is the current active verse, later arrivals
    // confirm it instead of creating duplicate history entries.
    const hfbState = useHFBStore.getState();
    const currentDetection =
      hfbState.hfbDetectedVerses.find((item) => item.isActive) ||
      hfbState.hfbDetectedVerses[hfbState.hfbDetectedVerses.length - 1];
    const currentDetectionKey = currentDetection
      ? `${currentDetection.version.toLowerCase()}|${currentDetection.book}|${currentDetection.chapter}|${currentDetection.verseNum}`
      : "";
    const currentProjectionKey = hfbState.hfbCurrentProjected
      ? `${hfbState.hfbCurrentProjected.version.toLowerCase()}|${hfbState.hfbCurrentProjected.reference}`
      : "";
    const incomingProjectionKey = `${versionKey}|${book} ${chapter}:${verseNum}`;
    if (
      projectionKey === currentDetectionKey ||
      incomingProjectionKey === currentProjectionKey
    ) {
      lastProjectedRef.current = { key: projectionKey, at: now };
      setDetectedCommands(`${book} ${chapter}:${verseNum}`);
      console.info(`[HFB] Duplicate confirmation suppressed: ${projectionKey}`);
      return;
    }

    const incomingServerTime =
      data?.telemetry?.serverResolvedAt ||
      data?.serverDetectedAt ||
      data?.serverTimestamp;
    if (incomingServerTime && lastServerProjectionAtRef.current > 0) {
      if (incomingServerTime < lastServerProjectionAtRef.current - 300) {
        console.info(
          `[HFB] Stale server projection suppressed: ${projectionKey} (${incomingServerTime} < ${lastServerProjectionAtRef.current})`,
        );
        return;
      }
    }

    if (
      projectionKey === lastProjectedRef.current.key &&
      now - lastProjectedRef.current.at < 5000
    ) {
      return;
    }
    if (!text.trim()) {
      console.warn(
        `[HFB] ${effectiveVersion} text is unavailable for ${book} ${chapter}:${verseNum}`,
      );
      return;
    }
    projectionGenerationRef.current += 1;
    lastProjectedRef.current = { key: projectionKey, at: now };
    lastProjectionTimestampRef.current = Date.now();
    if (incomingServerTime) {
      lastServerProjectionAtRef.current = incomingServerTime;
    }

    const currentVerseContext = { book, chapter, verse: verseNum };
    currentVerseContextRef.current = currentVerseContext;
    setWidgetVerseData(verses || null);
    setWidgetFormattedReference(`${book} ${chapter}:${verseNum}`);
    setDetectedCommands(`${book} ${chapter}:${verseNum}`);

    const verseForStore = verseData
      ? ({
          book,
          chapter,
          verse: verseNum,
          text,
          version: effectiveVersion,
          [versionKey]: text,
        } as any)
      : null;
    setZustandVerse(
      verseForStore,
      `${book} ${chapter}:${verseNum}`,
      effectiveVersion,
    );

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
      chapter,
    });

    // Set all other detected verses to inactive
    useHFBStore
      .getState()
      .setHfbDetectedVerses((prev) =>
        prev.map((d) => ({ ...d, isActive: d.id === detectedId })),
      );
    useHFBStore
      .getState()
      .setHfbCurrentProjected({
        reference: `${book} ${chapter}:${verseNum}`,
        text,
        version: effectiveVersion,
      });

    // Asynchronously fetch and display the whole chapter in Center Stage
    useHFBStore
      .getState()
      .fetchHFBChapter(book, chapter, effectiveVersion, verseNum);

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
      clientProjectionMs: telemetry.clientClickAt
        ? projectedAt - telemetry.clientClickAt
        : telemetry.clientStartedAt
          ? projectedAt - telemetry.clientStartedAt
          : undefined,
      projectedAt,
      reference: `${book} ${chapter}:${verseNum}`,
    };
    console.info("[HFB Latency]", latency);
    const measuredLatency =
      latency.clientProjectionMs ?? latency.serverToClientMs;
    if (typeof measuredLatency === "number") {
      useHFBStore.getState().setHfbLatency(measuredLatency, latency.source);
    }
    window.dispatchEvent(
      new CustomEvent("qworship:hfb-latency", { detail: latency }),
    );
  };

  const processInterimLocally = async (
    text: string,
    metadata?: {
      confidence?: number;
      serverReceivedAt?: number;
      clientReceivedAt: number;
    },
  ): Promise<boolean> => {
    const parseStarted = performance.now();
    const fromIndex = consumedCursorIndexRef.current;
    const parsed = parseHFBReference(text, fromIndex);
    if (!parsed) return false;

    // Monotonic character stream guard
    if (parsed.start < fromIndex || parsed.start < lastParsedOffsetRef.current) {
      return false;
    }

    const version = selectedBibleVersionRef.current.toUpperCase();
    const key = `${version}|${parsed.book}|${parsed.chapter}|${parsed.verse}`;

    // Dedup guard: if this exact verse was already executed in this speech turn, skip!
    if (executedTurnReferencesRef.current.has(key)) {
      return false;
    }

    const now = performance.now();
    const previous = pendingInterimRef.current;
    const sameCandidate = previous.key === key && now - previous.at < 1500;
    const count = sameCandidate ? previous.count + 1 : 1;
    const firstSeenAt = sameCandidate
      ? previous.firstSeenAt || previous.at
      : now;
    pendingInterimRef.current = { key, count, at: now, firstSeenAt };

    const strictMode = useHFBStore.getState().hfbStrictMode;
    const confidence = metadata?.confidence ?? 0;
    const hasStrictCue =
      /\b(?:bible|show(?:\s+me)?|project|display|open|turn\s+to|go\s+to|take\s+me\s+to|look\s+(?:at|to)|let'?s\s+see|let\s+us\s+see|can\s+we\s+see|read(?:\s+from)?)\b/i.test(
        text,
      );
    if (strictMode && !hasStrictCue) return false;

    // Clear, complete references project on their first high-confidence interim.
    // In Psalms, if the chapter is <= 15 (e.g. "Psalms 1 1", "Psalms 1 15") and there is no explicit
    // word "verse" or colon separator ":", it might be an unfinalized prefix of a 3-digit chapter (e.g. Psalms 115:2).
    // In that case, wait for a 2nd confirmation frame or explicit "verse" delimiter before projecting.
    const isPsalmsAmbiguousPrefix =
      parsed.book === "Psalms" &&
      parsed.chapter <= 15 &&
      !/\bverse\b/i.test(parsed.rawText) &&
      !/:/.test(parsed.rawText) &&
      parsed.end >= text.length - 2;

    const baseRequired =
      confidence >= 0.85 ? 1 : confidence >= 0.65 ? 2 : Infinity;
    const requiredResults = isPsalmsAmbiguousPrefix
      ? Math.max(2, baseRequired)
      : baseRequired;

    if (count < requiredResults) {
      // Live HUD candidate evaluating
      useHFBStore.getState().setHfbLiveTokens({
        committedText: text.slice(0, fromIndex),
        candidate: {
          text: parsed.rawText,
          type: "reference",
          status: "evaluating",
          label: `${parsed.book} ${parsed.chapter}:${parsed.verse}`,
        },
        liveTailText: text.slice(parsed.end),
      });
      return true;
    }

    const lookupSequence = ++localLookupSequenceRef.current;
    const projectionGeneration = projectionGenerationRef.current;
    const resolved = await resolveHFBVerse(
      parsed.book,
      parsed.chapter,
      parsed.verse,
      version,
    );
    if (!resolved) {
      setDetectedCommands(`Lookup failed: ${parsed.book} ${parsed.chapter}:${parsed.verse}`);
      return false;
    }
    if (
      lookupSequence !== localLookupSequenceRef.current ||
      projectionGeneration !== projectionGenerationRef.current
    )
      return false;

    // Mark as executed and advance monotonic token cursor past this reference
    executedTurnReferencesRef.current.add(key);
    lastParsedOffsetRef.current = parsed.start;
    consumedCursorIndexRef.current = Math.max(consumedCursorIndexRef.current, parsed.end);

    // Live HUD candidate executed
    useHFBStore.getState().setHfbLiveTokens({
      committedText: text.slice(0, consumedCursorIndexRef.current),
      candidate: {
        text: parsed.rawText,
        type: "reference",
        status: "executed",
        label: `${parsed.book} ${parsed.chapter}:${parsed.verse}`,
      },
      liveTailText: text.slice(consumedCursorIndexRef.current),
    });

    const versionKey = version.toLowerCase();
    handleBibleMatch(
      {
        commandType: "lookup",
        result: {
          book: parsed.book,
          chapter: parsed.chapter,
          verses: [{ verse: parsed.verse, [versionKey]: resolved.text }],
        },
        telemetry: {
          source: `client-${resolved.source}`,
          clientStartedAt: metadata?.clientReceivedAt || Date.now(),
          parserMs: performance.now() - parseStarted,
        },
      },
      version,
    );
    return true;
  };

  const executeNavigation = async (
    commandType: string,
    direction?: string,
    targetVerse?: number,
    offset?: number,
    overrideVersion?: string, // QC64: explicit version override for version-switch re-projection
    targetChapter?: number,
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
    } else if (commandType === "jump_to_chapter_verse") {
      commandText = `Go to chapter ${targetChapter} verse ${targetVerse}`;
    } else if (commandType === "last_verse") {
      commandText = `Last verse`;
    } else if (commandType === "jump_relative") {
      commandText = `Jump ${offset! > 0 ? `forward ${offset}` : `back ${-offset!}`} verses`;
    }

    setDetectedCommands(commandText);

    // We need to fetch the next/previous verse using the current context
    const globalVerse = useBibleProjectionStore.getState().currentVerse;
    const hfbState = useHFBStore.getState();
    const currentContext =
      globalVerse?.book && globalVerse.chapter && globalVerse.verse
        ? {
            book: globalVerse.book,
            chapter: globalVerse.chapter,
            verse: globalVerse.verse,
          }
        : currentVerseContextRef.current?.book &&
            currentVerseContextRef.current?.chapter &&
            currentVerseContextRef.current?.verse
          ? currentVerseContextRef.current
          : hfbState.hfbBookName && hfbState.hfbChapter
            ? {
                book: hfbState.hfbBookName,
                chapter: hfbState.hfbChapter,
                verse: hfbState.hfbActiveVerseNum || 1,
              }
            : null;
    console.log("[HandsfreeBible] executeNavigation triggered", {
      commandType,
      direction,
      targetVerse,
      targetChapter,
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
    const requestSequence = ++navigationRequestSequenceRef.current;
    const projectionGeneration = projectionGenerationRef.current;
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
        targetChapter,
        offset,
      });

      console.log("[HandsfreeBible] Fetch status:", response.status);
      if (response.status >= 200 && response.status < 300) {
        if (
          requestSequence !== navigationRequestSequenceRef.current ||
          projectionGeneration !== projectionGenerationRef.current
        ) {
          console.info("[HFB] Stale navigation response suppressed");
          return;
        }
        const data = response.data;
        console.log("[HandsfreeBible] Navigation API response:", data);
        if (data.success && data.result) {
          // QC64 fix: Pass overrideVersion so handleBibleMatch uses the correct
          // version key when looking up text (avoids stale selectedBibleVersion state).
          handleBibleMatch(
            {
              result: data.result,
              commandType: data.commandType,
            },
            overrideVersion,
          );
        } else {
          console.warn("[HandsfreeBible] Navigation failed:", data.error);
        }
      } else {
        console.error(
          "[HandsfreeBible] Navigation fetch failed. Status:",
          response.status,
        );
        console.error("[HandsfreeBible] Error body:", response.data);
      }
    } catch (error) {
      console.error(
        "[HandsfreeBible] Error executing navigation command:",
        error,
      );
    }
  };
  executeNavigationRef.current = executeNavigation;

  useEffect(() => {
    const refreshInvalidatedVersion = (event: Event) => {
      const versions =
        (event as CustomEvent<{ versions?: string[] }>).detail?.versions || [];
      const activeVersion = selectedBibleVersionRef.current.toLowerCase();
      if (!versions.includes(activeVersion)) return;
      const current = useBibleProjectionStore.getState().currentVerse;
      if (!current?.book || !current.chapter || !current.verse) return;
      void executeNavigationRef
        .current(
          "jump_to_verse",
          undefined,
          current.verse,
          undefined,
          selectedBibleVersionRef.current,
        )
        .catch(() => undefined);
    };
    window.addEventListener(
      "qworship:bible-cache-invalidated",
      refreshInvalidatedVersion,
    );
    return () =>
      window.removeEventListener(
        "qworship:bible-cache-invalidated",
        refreshInvalidatedVersion,
      );
  }, []);

  const { isRecording, volume, startRecording, stopRecording } =
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
      useHFBStore.getState().setHfbCurrentPartial("");
      setMicrophoneStatus("Idle");
      setDetectedCommands("Stopped listening due to inactivity");
    }, INACTIVITY_TIMEOUT_MS);
  }, [clearInactivityTimer, stopRecording]);

  const applyVoiceVersionChange = (version: string) => {
    const normalized = version.toUpperCase();
    if (selectedBibleVersionRef.current === normalized) return;

    selectedBibleVersionRef.current = normalized;
    setSelectedBibleVersion(normalized);
    const hfbState = useHFBStore.getState();
    hfbState.setHfbVersion(normalized);
    setDetectedCommands(`Switched to ${normalized}`);

    const ctx = currentVerseContextRef.current;
    const book = ctx?.book || hfbState.hfbBookName;
    const chapter = ctx?.chapter || hfbState.hfbChapter;
    const verseNum = ctx?.verse || hfbState.hfbActiveVerseNum || 1;

    if (book && chapter) {
      void hfbState.fetchHFBChapter(book, chapter, normalized, verseNum);
    }

    if (ctx?.book && ctx.chapter && ctx.verse) {
      console.log(
        `[HandsfreeBible] Auto-refreshing ${ctx.book} ${ctx.chapter}:${ctx.verse} in ${normalized}`,
      );
      void executeNavigation(
        "jump_to_verse",
        undefined,
        ctx.verse,
        undefined,
        normalized,
      );
    }
  };

  const processContextNavigationLocally = (
    text: string,
    confidence = 0,
    isFinal = false,
  ): boolean => {
    const fromIndex = consumedCursorIndexRef.current;
    const navigations = scanHFBContextNavigations(text, fromIndex);
    if (!navigations.length) return false;

    const targetNavigations = isFinal
      ? navigations
      : [navigations[navigations.length - 1]];

    const parsedRef = parseHFBReference(text);
    const bookName =
      parsedRef?.book ||
      useHFBStore.getState().hfbBookName ||
      useBibleProjectionStore.getState().currentVerse?.book ||
      currentVerseContextRef.current?.book;
    if (!bookName) return false;

    if (
      parsedRef?.book &&
      currentVerseContextRef.current?.book &&
      parsedRef.book !== currentVerseContextRef.current.book
    ) {
      executedContextNavigationsRef.current.clear();
    }

    let handledAny = false;
    for (const navigation of targetNavigations) {
      if (
        !Number.isInteger(navigation.chapter) ||
        navigation.chapter < 1 ||
        !Number.isInteger(navigation.verse) ||
        navigation.verse < 1
      ) {
        continue;
      }

      const key = `${bookName}|${navigation.chapter}|${navigation.verse}`;
      const now = performance.now();

      if (executedContextNavigationsRef.current.has(key)) {
        handledAny = true;
        continue;
      }

      const previous = pendingInterimRef.current;
      const sameCandidate = previous.key === key && now - previous.at < 1500;
      const count = sameCandidate ? previous.count + 1 : 1;
      pendingInterimRef.current = {
        key,
        count,
        at: now,
        firstSeenAt: sameCandidate ? previous.firstSeenAt || previous.at : now,
      };

      const requiredResults = isFinal
        ? 1
        : confidence >= 0.85
          ? 1
          : confidence >= 0.65
            ? 2
            : Infinity;

      if (count < requiredResults) {
        useHFBStore.getState().setHfbLiveTokens({
          committedText: text.slice(0, fromIndex),
          candidate: {
            text: navigation.rawText,
            type: "navigation",
            status: "evaluating",
            label: `${bookName} ${navigation.chapter}:${navigation.verse}`,
          },
          liveTailText: text.slice(navigation.end),
        });
        return true;
      }

      executedContextNavigationsRef.current.add(key);
      consumedCursorIndexRef.current = Math.max(consumedCursorIndexRef.current, navigation.end);
      lastContextNavigationRef.current = { key, at: now };

      useHFBStore.getState().setHfbLiveTokens({
        committedText: text.slice(0, consumedCursorIndexRef.current),
        candidate: {
          text: navigation.rawText,
          type: "navigation",
          status: "executed",
          label: `${bookName} ${navigation.chapter}:${navigation.verse}`,
        },
        liveTailText: text.slice(consumedCursorIndexRef.current),
      });

      console.info(
        `[HFB] Client contextual navigation: ${bookName} ${navigation.chapter}:${navigation.verse} (conf: ${confidence.toFixed(2)})`,
      );
      void executeNavigation(
        "jump_to_chapter_verse",
        undefined,
        navigation.verse,
        undefined,
        undefined,
        navigation.chapter,
      );
      return true;
    }

    return handledAny;
  };

  const NEXT_VERSE_RE =
    /\b(?:show me the next verse|take me to the next verse|show me the next|take me to the next|next verse please|move to next verse|go to next verse|skip to next verse|next verse)\b/i;
  const PREV_VERSE_RE =
    /\b(?:show me the previous verse|take me to the previous verse|show me the previous|take me to the previous|previous verse please|move to previous verse|go to previous verse|previous verse)\b/i;
  const NEXT_CHAP_RE = /\b(?:next chapter|following chapter)\b/i;
  const PREV_CHAP_RE =
    /\b(?:previous chapter|last chapter|go back a chapter)\b/i;

  const processRelativeNavigationLocally = (
    text: string,
    confidence = 0,
    isFinal = false,
  ): boolean => {
    const fromIndex = consumedCursorIndexRef.current;
    const unconsumedText = text.slice(fromIndex);

    let direction: "next" | "previous" | null = null;
    let scope: "verse" | "chapter" = "verse";
    let rawMatch = "";

    const nextVerseMatch = NEXT_VERSE_RE.exec(unconsumedText);
    const prevVerseMatch = PREV_VERSE_RE.exec(unconsumedText);
    const nextChapMatch = NEXT_CHAP_RE.exec(unconsumedText);
    const prevChapMatch = PREV_CHAP_RE.exec(unconsumedText);

    if (nextVerseMatch) {
      direction = "next";
      scope = "verse";
      rawMatch = nextVerseMatch[0];
    } else if (prevVerseMatch) {
      direction = "previous";
      scope = "verse";
      rawMatch = prevVerseMatch[0];
    } else if (nextChapMatch) {
      direction = "next";
      scope = "chapter";
      rawMatch = nextChapMatch[0];
    } else if (prevChapMatch) {
      direction = "previous";
      scope = "chapter";
      rawMatch = prevChapMatch[0];
    }

    if (!direction) return false;

    const current =
      useBibleProjectionStore.getState().currentVerse ||
      currentVerseContextRef.current;
    if (!current?.book) return false;

    const key = `nav:${scope}:${direction}`;
    const now = performance.now();

    if (executedRelativeNavigationsRef.current.has(key)) {
      return true;
    }

    const previous = pendingInterimRef.current;
    const sameCandidate = previous.key === key && now - previous.at < 1500;
    const count = sameCandidate ? previous.count + 1 : 1;
    pendingInterimRef.current = {
      key,
      count,
      at: now,
      firstSeenAt: sameCandidate ? previous.firstSeenAt || previous.at : now,
    };

    const requiredResults = isFinal
      ? 1
      : confidence >= 0.85
        ? 1
        : confidence >= 0.65
          ? 2
          : Infinity;

    if (count < requiredResults) {
      useHFBStore.getState().setHfbLiveTokens({
        committedText: text.slice(0, fromIndex),
        candidate: {
          text: rawMatch,
          type: "navigation",
          status: "evaluating",
          label: `${direction === "next" ? "Next" : "Previous"} ${scope}`,
        },
        liveTailText: "",
      });
      return true;
    }

    executedRelativeNavigationsRef.current.add(key);
    consumedCursorIndexRef.current = text.length;
    lastContextNavigationRef.current = { key, at: now };

    useHFBStore.getState().setHfbLiveTokens({
      committedText: text,
      candidate: {
        text: rawMatch,
        type: "navigation",
        status: "executed",
        label: `${direction === "next" ? "Next" : "Previous"} ${scope}`,
      },
      liveTailText: "",
    });

    console.info(
      `[HFB] Client relative navigation: ${direction} ${scope} (conf: ${confidence.toFixed(2)})`,
    );
    void executeNavigation(
      scope === "chapter" ? "chapter_change" : "verse_change",
      direction,
    );
    return true;
  };

  // QUOTE MODE (trial): operator-confirmed suggestions project through the
  // same path as a server bible_match so all guards/history apply.
  const quoteMode = useHFBQuoteMode({
    projectVerse: (book, chapter, verse, text) => {
      const versionKey = selectedBibleVersionRef.current.toLowerCase();
      handleBibleMatch({
        commandType: "quote_confirm",
        result: { book, chapter, verses: [{ verse, text, [versionKey]: text }] },
      });
    },
  });

  const {
    connect,
    disconnect,
    sendPCMData,
    isConnected,
    setStrictMode,
    setBibleVersion,
    setBibleContext,
    beginSessionTrace,
    setHfbSubMode: sendHfbSubModeToServer,
  } = useRealtimeSocket({
    onSocketOpen: () => {
      console.info("[HFB] Socket connected/reconnected — resetting sequence and server clock tracking");
      lastServerProjectionSequenceRef.current = 0;
      lastServerProjectionAtRef.current = 0;
      sendHfbSubModeToServer(useHFBStore.getState().hfbSubMode); // QUOTE MODE (trial)
    },
    onVerseSuggestion: quoteMode.onServerSuggestion, // QUOTE MODE (trial)
    onBibleMatch: (data: any) => {
      resetInactivityTimer();
      handleBibleMatch(data);
    },
    onPartialTranscript: (text, metadata) => {
      if (!firstPartialSeenRef.current && listeningRequestedAtRef.current) {
        firstPartialSeenRef.current = true;
        console.info("[HFB Latency] First visible transcript", {
          clickToFirstTranscriptMs: Math.round(
            performance.now() - listeningRequestedAtRef.current,
          ),
        });
      }
      resetInactivityTimer();

      // Local Wake / Sleep handling
      if (/\b(?:pause bible|stop bible|go to sleep|sleep bible|stop listening|pause listening)\b/i.test(text)) {
        setIsSleepMode(true);
        setMicrophoneStatus("Sleeping");
        setDetectedCommands(`Sleeping... Say "Bible" or "I'm ready" to wake`);
        return;
      }
      if (isSleepMode) {
        if (/\b(?:hey bible|wake up|start listening|i'm ready|im ready|bible)\b/i.test(text)) {
          setIsSleepMode(false);
          setMicrophoneStatus("Listening");
          setDetectedCommands("Awake! Listening for commands...");
        } else {
          return;
        }
      }

      setMicrophoneStatus("Processing");

      // Reset turn tracking when a new utterance begins or when transcript resets/shortens
      if (
        isNewUtteranceRef.current ||
        text.length < lastTranscriptTextRef.current.length - 10
      ) {
        isNewUtteranceRef.current = false;
        consumedCursorIndexRef.current = 0;
        executedContextNavigationsRef.current.clear();
        executedRelativeNavigationsRef.current.clear();
        executedTurnReferencesRef.current.clear();
        lastParsedOffsetRef.current = 0;
      }
      lastTranscriptTextRef.current = text;

      const unconsumed = text.slice(consumedCursorIndexRef.current);
      const requestedVersion = parseBibleVersionCommand(unconsumed);
      if (requestedVersion) {
        consumedCursorIndexRef.current = text.length;
        applyVoiceVersionChange(requestedVersion);
        useHFBStore.getState().setHfbLiveTokens({
          committedText: text,
          candidate: { text: requestedVersion, type: 'version', status: 'executed', label: requestedVersion },
          liveTailText: "",
        });
      }

      useHFBStore
        .getState()
        .setHfbCurrentPartial(text, metadata?.detectedReferences);
      quoteMode.onPartial(text); // QUOTE MODE (trial)

      const conf = metadata?.confidence ?? 0;
      const isHandled =
        processContextNavigationLocally(text, conf, false) ||
        processRelativeNavigationLocally(text, conf, false);

      if (!isHandled) {
        void processInterimLocally(text, metadata).then((handled) => {
          if (!handled && !requestedVersion) {
            useHFBStore.getState().setHfbLiveTokens({
              committedText: text.slice(0, consumedCursorIndexRef.current),
              candidate: undefined,
              liveTailText: text.slice(consumedCursorIndexRef.current),
            });
          }
        });
      }
    },
    onFinalTranscript: (text) => {
      resetInactivityTimer();

      // Local Wake / Sleep handling for final
      if (/\b(?:pause bible|stop bible|go to sleep|sleep bible|stop listening|pause listening)\b/i.test(text)) {
        setIsSleepMode(true);
        setMicrophoneStatus("Sleeping");
        setDetectedCommands(`Sleeping... Say "Bible" or "I'm ready" to wake`);
        return;
      }
      if (isSleepMode) {
        if (/\b(?:hey bible|wake up|start listening|i'm ready|im ready|bible)\b/i.test(text)) {
          setIsSleepMode(false);
          setMicrophoneStatus("Listening");
          setDetectedCommands("Awake! Listening for commands...");
        } else {
          return;
        }
      }

      setMicrophoneStatus("Listening");
      lastTranscriptTextRef.current = "";
      useHFBStore.getState().setHfbCurrentPartial(""); // Clear partial when final arrives
      useHFBStore.getState().setHfbLiveTokens({ committedText: '', liveTailText: '' });
      consumedCursorIndexRef.current = 0;
      quoteMode.onFinal(text); // QUOTE MODE (trial)
      const requestedVersion = parseBibleVersionCommand(text);
      if (requestedVersion) applyVoiceVersionChange(requestedVersion);
      if (
        !processContextNavigationLocally(text, 1.0, true) &&
        !processRelativeNavigationLocally(text, 1.0, true)
      ) {
        void processInterimLocally(text, { clientReceivedAt: Date.now(), confidence: 1.0 });
      }
      // Mark next transcript as a fresh turn so executed refs clear cleanly on the next sentence
      isNewUtteranceRef.current = true;
      if (text.trim()) {
        useHFBStore.getState().addHfbTranscriptLine({
          id: Date.now(),
          text,
          ts: new Date().toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
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
      applyVoiceVersionChange(version);
    },
    onNavigation: (
      commandType,
      direction,
      targetVerse,
      offset,
      targetChapter,
      serverTimestamp,
    ) => {
      resetInactivityTimer();
      if (serverTimestamp && lastServerProjectionAtRef.current > 0) {
        if (serverTimestamp < lastServerProjectionAtRef.current - 300) {
          console.info(
            `[HFB] Stale server navigation suppressed (${serverTimestamp} < ${lastServerProjectionAtRef.current})`,
          );
          return;
        }
      }
      if (serverTimestamp) {
        lastServerProjectionAtRef.current = Math.max(
          lastServerProjectionAtRef.current,
          serverTimestamp,
        );
      }
      executeNavigation(
        commandType,
        direction,
        targetVerse,
        offset,
        undefined,
        targetChapter,
      );
    },
    onReferenceStage: ({ book, chapter }) => {
      // Predictively pre-warm RAM cache in the background without modifying Center Stage UI
      const version = selectedBibleVersionRef.current.toLowerCase();
      void db.verses
        .where({ version, book, chapter })
        .toArray()
        .then((verses) => {
          if (verses && verses.length > 0) {
            useBibleRAMCache
              .getState()
              .setChapterInRam(version, book, chapter, verses as any);
          }
        })
        .catch(() => {});
    },
    onError: (message) => {
      connectionAttemptRef.current += 1;
      voiceReadyRef.current = false;
      useHFBStore.getState().setHfbCurrentPartial("");
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
        setMicrophoneStatus(
          isListeningMode ? "Reconnecting voice..." : "Connecting voice...",
        );
      } else if (status === "connected") {
        voiceReadyRef.current = true;
        setHfbConnectionStatus("ready");
        setMicrophoneStatus(isListeningMode ? "Listening" : "Voice ready");
      } else if (status === "disconnected") {
        voiceReadyRef.current = false;
        useHFBStore.getState().setHfbCurrentPartial("");
        setHfbConnectionStatus(
          isListeningMode ? "reconnecting" : "disconnected",
        );
        setMicrophoneStatus(
          isListeningMode ? "Reconnecting voice..." : "Disconnected",
        );
      }
    },
    onAudioStatus: () => {
      setIsAudioStreaming(true);
      setMicrophoneStatus("Listening");
    },
  });

  // QUOTE MODE (trial): keep the server's matcher in step with the toggle.
  const hfbSubMode = useHFBStore((s) => s.hfbSubMode);
  useEffect(() => {
    sendHfbSubModeToServer(hfbSubMode);
  }, [hfbSubMode, sendHfbSubModeToServer]);

  // Keep the voice socket aware of manual clicks and projections originating
  // outside HFB. Contextual commands can then preserve the active book without
  // waiting for another full spoken reference.
  useEffect(() => {
    if (
      !projectedBibleVerse?.book ||
      !projectedBibleVerse.chapter ||
      !projectedBibleVerse.verse
    )
      return;
    setBibleContext({
      book: projectedBibleVerse.book,
      chapter: projectedBibleVerse.chapter,
      verse: projectedBibleVerse.verse,
    });
  }, [
    projectedBibleVerse?.book,
    projectedBibleVerse?.chapter,
    projectedBibleVerse?.verse,
    setBibleContext,
  ]);

  const hfbStrictMode = useHFBStore((state) => state.hfbStrictMode);

  // Sync strict mode to the backend
  useEffect(() => {
    if (isConnected) {
      setStrictMode(hfbStrictMode);
      setBibleVersion(hfbVersion);
    }
  }, [isConnected, hfbStrictMode, hfbVersion, setStrictMode, setBibleVersion]);

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

  // Warm the browser -> server -> Deepgram path as soon as HFB is visible.
  // The microphone still starts only from an explicit user click.
  useEffect(() => {
    if ((isHandsfreeBibleOpen || effectivePanelActive) && !isConnected) {
      connect();
    } else if (
      !isHandsfreeBibleOpen &&
      !effectivePanelActive &&
      !isListeningMode &&
      isConnected
    ) {
      disconnect();
    }
  }, [
    isHandsfreeBibleOpen,
    effectivePanelActive,
    isListeningMode,
    connect,
    disconnect,
    isConnected,
  ]);

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

  const closeHandsfreeBible = () => {
    setIsHandsfreeBibleOpen(false);
    setIsWidgetVisible(false);
    setHasBeenDragged(false);

    setDetectedCommands("No commands detected");
    currentVerseContextRef.current = null;
    setWidgetVerseData(null);
    clearZustandProjection();
    useHFBStore.getState().clearAllState();

    stopRecording();
    isNewUtteranceRef.current = true;
    consumedCursorIndexRef.current = 0;
    executedTurnReferencesRef.current.clear();
    lastParsedOffsetRef.current = 0;
    executedContextNavigationsRef.current.clear();
    executedRelativeNavigationsRef.current.clear();
    useHFBStore.getState().setHfbCurrentPartial("");
    useHFBStore.getState().setHfbLiveTokens({ committedText: '', liveTailText: '' });
    clearInactivityTimer();
    disconnect();
    setIsListeningMode(false);
    setIsVoiceConnecting(false);
    setIsAudioStreaming(false);
    setIsSleepMode(true);
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
    } else closeHandsfreeBible();

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
      isNewUtteranceRef.current = true;
      consumedCursorIndexRef.current = 0;
      executedTurnReferencesRef.current.clear();
      lastParsedOffsetRef.current = 0;
      executedContextNavigationsRef.current.clear();
      executedRelativeNavigationsRef.current.clear();
      useHFBStore.getState().setHfbCurrentPartial("");
      useHFBStore.getState().setHfbLiveTokens({ committedText: '', liveTailText: '' });
      clearInactivityTimer();
      setMicrophoneStatus("Idle");
      setDetectedCommands("Stopped listening");
    } else {
      const attemptId = ++connectionAttemptRef.current;
      listeningRequestedAtRef.current = performance.now();
      firstPartialSeenRef.current = false;
      isNewUtteranceRef.current = true;
      consumedCursorIndexRef.current = 0;
      executedTurnReferencesRef.current.clear();
      lastParsedOffsetRef.current = 0;
      executedContextNavigationsRef.current.clear();
      executedRelativeNavigationsRef.current.clear();
      useHFBStore.getState().setHfbCurrentPartial("");
      useHFBStore.getState().setHfbLiveTokens({ committedText: '', liveTailText: '' });
      setIsSleepMode(false);
      // Reflect the user's action immediately. Connection readiness remains an
      // internal concern; the same button can stop a pending start.
      setIsListeningMode(true);
      setIsVoiceConnecting(true);
      setMicrophoneStatus("Listening");
      setDetectedCommands("Listening for a Bible reference…");
      setHfbConnectionStatus(voiceReadyRef.current ? "ready" : "connecting");
      if (!isConnected) connect();
      beginSessionTrace(Date.now());

      try {
        // Send immediately. useRealtimeSocket buffers the opening second while
        // the browser socket connects, and the server buffers again until
        // Deepgram is open. No opening words are discarded.
        await startRecording((pcmBuffer) => {
          sendPCMData(pcmBuffer);
        });
        if (connectionAttemptRef.current !== attemptId) {
          stopRecording();
          return;
        }
        console.info("[HFB Latency] Microphone capture started", {
          clickToCaptureMs: Math.round(
            performance.now() - listeningRequestedAtRef.current,
          ),
        });
        setIsVoiceConnecting(false);
        setMicrophoneStatus("Listening");
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
    closeHandsfreeBible,
    toggleMicrophone,
    setSelectedBibleVersion,
    handleDragStart,
    setIsListeningMode,
    setDetectedCommands,
    executeNavigation,
    // QUOTE MODE (trial)
    confirmQuoteSuggestion: quoteMode.confirmSuggestion,
    dismissQuoteSuggestion: quoteMode.dismissSuggestion,
  };
};

export type UseHandsfreeBibleReturn = ReturnType<typeof useHandsfreeBible>;
