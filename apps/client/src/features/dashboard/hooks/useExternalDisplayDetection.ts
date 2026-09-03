import { useCallback, useEffect, useRef, useState } from "react";

// Persists only whether the operator has previously granted the
// window-management permission through our own "enable" action - the real
// grant is remembered by the browser regardless; this flag just controls
// whether this hook quietly re-attaches on future page loads instead of
// waiting for another click.
const ENABLED_FLAG_KEY = "qworship-window-management-enabled";

export interface UseExternalDisplayDetectionResult {
  /** False on any browser without the Window Management API (Firefox, Safari). */
  supported: boolean;
  /** Whether the operator has previously granted the permission via requestEnable(). */
  enabled: boolean;
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
  const screenDetailsRef = useRef<ScreenDetails | null>(null);

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
      });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [supported, enabled, attach]);

  const requestEnable = useCallback(async () => {
    if (!supported || !window.getScreenDetails) return;
    try {
      const details = await window.getScreenDetails();
      attach(details);
      setEnabled(true);
      try {
        localStorage.setItem(ENABLED_FLAG_KEY, "true");
      } catch {}
    } catch (error) {
      console.warn("[ExternalDisplay] permission request failed or was denied:", error);
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
    externalScreenAvailable: !!externalScreen,
    externalScreen,
    requestEnable,
    dismiss,
    disableDetection,
  };
}
