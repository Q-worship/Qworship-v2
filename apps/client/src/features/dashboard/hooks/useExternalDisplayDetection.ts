import { useEffect } from "react";
import { create } from "zustand";

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

export interface ExternalDisplayState {
  /** False on any browser without the Window Management API (Firefox, Safari). */
  supported: boolean;
  /** Whether the operator has previously granted the permission via requestEnable(). */
  enabled: boolean;
  /** True while a getScreenDetails() call is in flight (drives a "Detecting..." state). */
  isDetecting: boolean;
  externalScreen: ScreenDetailed | null;
  /** True only while a genuine second screen is currently present and not dismissed. */
  externalScreenAvailable: boolean;
  /** Persisted default Go Live target ("web" until the operator changes it). */
  defaultOutput: DisplayOutputMode;
  /** Must be called from a click handler - this is what raises the native permission prompt.
   *  Safe to call again once already enabled (idempotent, no new prompt). */
  requestEnable: () => Promise<void>;
  /** Hides the current prompt without disabling detection for future screenschange events. */
  dismiss: () => void;
  /** Turns detection back off - stops listening and forgets the "enabled" flag (the OS/browser
   *  permission grant itself is untouched; re-enabling won't need a new prompt). */
  disableDetection: () => void;
  setDefaultOutput: (mode: DisplayOutputMode) => void;
}

const isSupported = typeof window !== "undefined" && "getScreenDetails" in window;

function readInitialEnabled(): boolean {
  if (!isSupported) return false;
  try {
    return localStorage.getItem(ENABLED_FLAG_KEY) === "true";
  } catch {
    return false;
  }
}

function readInitialDefaultOutput(): DisplayOutputMode {
  try {
    return localStorage.getItem(DEFAULT_OUTPUT_KEY) === "hdmi" ? "hdmi" : "web";
  } catch {
    return "web";
  }
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

// Module-level (not per-component) - there is only ever one real browser
// subscription, regardless of how many components read the store below.
let screenDetailsRef: ScreenDetails | null = null;
let detachListener: (() => void) | null = null;

function attach(details: ScreenDetails, set: (partial: Partial<ExternalDisplayState>) => void) {
  detachListener?.();
  screenDetailsRef = details;
  set({ externalScreen: pickExternalScreen(details), externalScreenAvailable: !!pickExternalScreen(details) });
  const handleChange = () => {
    const screen = pickExternalScreen(details);
    set({ externalScreen: screen, externalScreenAvailable: !!screen });
  };
  details.addEventListener("screenschange", handleChange);
  detachListener = () => details.removeEventListener("screenschange", handleChange);
}

export const useExternalDisplayDetection = create<ExternalDisplayState>((set, get) => ({
  supported: isSupported,
  enabled: readInitialEnabled(),
  isDetecting: false,
  externalScreen: null,
  externalScreenAvailable: false,
  defaultOutput: readInitialDefaultOutput(),

  requestEnable: async () => {
    const { supported } = get();
    if (!supported || !window.getScreenDetails) return;
    set({ isDetecting: true });
    try {
      const details = await window.getScreenDetails();
      attach(details, set);
      set({ enabled: true });
      try {
        localStorage.setItem(ENABLED_FLAG_KEY, "true");
      } catch {}
    } catch (error) {
      console.warn("[ExternalDisplay] permission request failed or was denied:", error);
    } finally {
      set({ isDetecting: false });
    }
  },

  dismiss: () => set({ externalScreen: null, externalScreenAvailable: false }),

  disableDetection: () => {
    detachListener?.();
    detachListener = null;
    screenDetailsRef = null;
    set({ enabled: false, externalScreen: null, externalScreenAvailable: false });
    try {
      localStorage.removeItem(ENABLED_FLAG_KEY);
    } catch {}
  },

  setDefaultOutput: (mode: DisplayOutputMode) => {
    set({ defaultOutput: mode });
    try {
      localStorage.setItem(DEFAULT_OUTPUT_KEY, mode);
    } catch {}
  },
}));

/** Re-attaches detection on load if the operator had previously enabled it -
 *  call exactly ONCE, from a component guaranteed to mount for the whole
 *  session (DashboardLayoutV2.tsx). Every other consumer just reads the
 *  store above directly; calling this more than once would attempt a second
 *  redundant getScreenDetails() but is otherwise harmless (attach() detaches
 *  any prior listener first). */
export function useExternalDisplayAutoAttach(): void {
  useEffect(() => {
    const { supported, enabled } = useExternalDisplayDetection.getState();
    if (!supported || !enabled || !window.getScreenDetails) return;
    let cancelled = false;

    useExternalDisplayDetection.setState({ isDetecting: true });
    window
      .getScreenDetails()
      .then((details) => {
        if (cancelled) return;
        attach(details, useExternalDisplayDetection.setState);
      })
      .catch(() => {
        // Permission was revoked outside the app (browser site settings) or
        // the call otherwise failed - quietly fall back to "not enabled"
        // rather than surfacing an error for something the operator didn't
        // actively do just now.
        useExternalDisplayDetection.setState({ enabled: false });
        try {
          localStorage.removeItem(ENABLED_FLAG_KEY);
        } catch {}
      })
      .finally(() => {
        if (!cancelled) useExternalDisplayDetection.setState({ isDetecting: false });
      });

    return () => {
      cancelled = true;
      detachListener?.();
      detachListener = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
