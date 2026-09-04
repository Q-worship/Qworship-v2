import { useCallback, useEffect, useRef, useState } from "react";

// Persists only whether the operator has previously granted the
// window-management permission through our own "enable" action - the real
// grant is remembered by the browser regardless; this flag just controls
// whether this hook quietly re-attaches on future page loads instead of
// waiting for another click.
const ENABLED_FLAG_KEY = "qworship-window-management-enabled";
// Persists which output Go Live should target by default. "hdmi" only
// actually routes there if a screen is currently detected at call time
// (see startGoLive in DashboardLayoutV2.tsx) - this is just the operator's
// standing preference, not a guarantee a screen is connected right now.
const DEFAULT_OUTPUT_KEY = "qworship-default-display-output";

export type DisplayOutputMode = "web" | "hdmi";

export interface UseExternalDisplayDetectionResult {
  /** False on any browser without the Window Management API (Firefox, Safari). */
  supported: boolean;
  /** Whether the operator has previously granted the permission via requestEnable(). */
  enabled: boolean;
  /** True while a getScreenDetails() call is in flight (drives a "Detecting..." state). */
  isDetecting: boolean;
  /** True only while a genuine second screen is currently present and not dismissed. */
  externalScreenAvailable: boolean;
  externalScreen: ScreenDetailed | null;
  /** Must be called from a click handler - this is what raises the native permission prompt. */
  requestEnable: () => Promise<void>;
  /** Hides the current prompt without disabling detection for future screenschange events. */
  dismiss: () => void;
  /** Turns detection back off - stops listening and forgets the "enabled" flag (the OS/browser
   *  permission grant itself is untouched; re-enabling won't need a new prompt). */
  disableDetection: () => void;
  /** Persisted default Go Live target ("web" until the operator changes it). */
  defaultOutput: DisplayOutputMode;
  setDefaultOutput: (mode: DisplayOutputMode) => void;
}

function pickExternalScreen(details: ScreenDetails): ScreenDetailed | null {
  if (details.screens.length <= 1) return null;
  const current = details.currentScreen;
  return (
    details.screens.find((s) => s !== current && !s.isPrimary) ||
    details.screens.find((s) => s !== current) ||
    null
  );
}

export function useExternalDisplayDetection(): UseExternalDisplayDetectionResult {
  const supported = typeof window !== "undefined" && "getScreenDetails" in window;
  const [enabled, setEnabled] = useState(() => {
    if (!supported) return false;
    try {
      return localStorage.getItem(ENABLED_FLAG_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [externalScreen, setExternalScreen] = useState<ScreenDetailed | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [defaultOutput, setDefaultOutputState] = useState<DisplayOutputMode>(() => {
    try {
      return localStorage.getItem(DEFAULT_OUTPUT_KEY) === "hdmi" ? "hdmi" : "web";
    } catch {
      return "web";
    }
  });
  const screenDetailsRef = useRef<ScreenDetails | null>(null);

  const setDefaultOutput = useCallback((mode: DisplayOutputMode) => {
    setDefaultOutputState(mode);
    try {
      localStorage.setItem(DEFAULT_OUTPUT_KEY, mode);
    } catch {}
  }, []);

  const attach = useCallback((details: ScreenDetails) => {
    screenDetailsRef.current = details;
    setExternalScreen(pickExternalScreen(details));
    const handleChange = () => setExternalScreen(pickExternalScreen(details));
    details.addEventListener("screenschange", handleChange);
    return () => details.removeEventListener("screenschange", handleChange);
  }, []);

  useEffect(() => {
    if (!supported || !enabled || !window.getScreenDetails) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    setIsDetecting(true);
    window
      .getScreenDetails()
      .then((details) => {
        if (cancelled) return;
        cleanup = attach(details);
      })
      .catch(() => {
        // Permission was revoked outside the app (browser site settings) or
        // the call otherwise failed - quietly fall back to "not enabled"
        // rather than surfacing an error for something the operator didn't
        // actively do just now.
        setEnabled(false);
        try {
          localStorage.removeItem(ENABLED_FLAG_KEY);
        } catch {}
      })
      .finally(() => {
        if (!cancelled) setIsDetecting(false);
      });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [supported, enabled, attach]);

  const requestEnable = useCallback(async () => {
    if (!supported || !window.getScreenDetails) return;
    setIsDetecting(true);
    try {
      const details = await window.getScreenDetails();
      attach(details);
      setEnabled(true);
      try {
        localStorage.setItem(ENABLED_FLAG_KEY, "true");
      } catch {}
    } catch (error) {
      console.warn("[ExternalDisplay] permission request failed or was denied:", error);
    } finally {
      setIsDetecting(false);
    }
  }, [supported, attach]);

  const dismiss = useCallback(() => setExternalScreen(null), []);

  const disableDetection = useCallback(() => {
    // Setting enabled false runs the effect's own cleanup (removes the
    // screenschange listener) on the next render - no extra plumbing needed.
    setEnabled(false);
    setExternalScreen(null);
    try {
      localStorage.removeItem(ENABLED_FLAG_KEY);
    } catch {}
  }, []);

  return {
    supported,
    enabled,
    isDetecting,
    externalScreenAvailable: !!externalScreen,
    externalScreen,
    requestEnable,
    dismiss,
    disableDetection,
    defaultOutput,
    setDefaultOutput,
  };
}
