import { create } from "zustand";

export interface LiveConsoleSettings {
  backgroundType: "solid" | "gradient" | "media" | "transparent";
  backgroundValue: string;
  backgroundMediaType?: "image" | "video";
  backgroundMediaId?: string;
  backgroundMediaSource?: "user" | "cloud";
  // Removes the dark rounded box (fill + border) that normally wraps the
  // projected slide text, leaving bare text. Same flag the live console's
  // own in-session Live Settings panel calls "slidesTransparent"
  // (features/dashboard/live/components/LiveSlideLayer.tsx).
  hideTextBox: boolean;
  fontColor: string;
  fontFamily: string;
  fontWeight: string;
  fontSizeMin: number;
  fontSizeMax: number;
  textAlign: "left" | "center" | "right";
  justifyContent: "flex-start" | "center" | "flex-end";
}

export const DEFAULT_LIVE_CONSOLE_SETTINGS: LiveConsoleSettings = {
  backgroundType: "solid",
  backgroundValue: "#000000",
  backgroundMediaType: undefined,
  backgroundMediaId: undefined,
  backgroundMediaSource: undefined,
  hideTextBox: false,
  fontColor: "#ffffff",
  fontFamily: "Inter, sans-serif",
  fontWeight: "700",
  fontSizeMin: 40,
  fontSizeMax: 140,
  textAlign: "center",
  justifyContent: "center",
};

const STORAGE_KEY = "qworship-live-console-settings-page";
const CHANNEL_NAME = "qworship-live-console-settings-sync";

// The live window (features/dashboard/live/useLivePresentationState.ts) seeds
// its *initial* background from this key every time GO LIVE opens a fresh
// window - it does NOT touch "qworship-live-background" (which the presenter's
// in-window Live Settings panel owns and which goLive() clears on every press,
// by design, so a live session never inherits stale per-session background
// state). Writing our own key means dashboard-configured defaults survive
// that clear, while anything the presenter changes in-window during a live
// session still takes priority once they touch it, unchanged from before.
const LIVE_WINDOW_SEED_KEY = "qworship-live-console-seed";

interface LiveWindowSeed {
  type: "color" | "image" | "video";
  color: string;
  image: string | null;
  video: string | null;
  hasLiveSettings: boolean;
  slidesTransparent: boolean;
}

function toLiveWindowSeed(settings: LiveConsoleSettings): LiveWindowSeed {
  // "Transparent" background implies no visible page background AND no
  // visible text box either - a fully see-through console for compositing.
  const slidesTransparent =
    settings.hideTextBox || settings.backgroundType === "transparent";

  switch (settings.backgroundType) {
    case "transparent":
      return { type: "color", color: "transparent", image: null, video: null, hasLiveSettings: true, slidesTransparent };
    case "media":
      if (settings.backgroundMediaType === "video") {
        return { type: "video", color: "#000000", image: null, video: settings.backgroundValue, hasLiveSettings: true, slidesTransparent };
      }
      return { type: "image", color: "#000000", image: settings.backgroundValue, video: null, hasLiveSettings: true, slidesTransparent };
    case "gradient":
      // getBackgroundStyle() treats a "color" value starting with
      // "linear-gradient" as a backgroundImage instead of backgroundColor.
      return { type: "color", color: settings.backgroundValue, image: null, video: null, hasLiveSettings: true, slidesTransparent };
    case "solid":
    default:
      return { type: "color", color: settings.backgroundValue, image: null, video: null, hasLiveSettings: true, slidesTransparent };
  }
}

function persistSeed(settings: LiveConsoleSettings) {
  try {
    localStorage.setItem(LIVE_WINDOW_SEED_KEY, JSON.stringify(toLiveWindowSeed(settings)));
  } catch {}
}

interface LiveConsoleSettingsState {
  settings: LiveConsoleSettings;
  setSettings: (updates: Partial<LiveConsoleSettings>) => void;
  broadcastState: () => void;
}

function loadPersistedSettings(): LiveConsoleSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_LIVE_CONSOLE_SETTINGS, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_LIVE_CONSOLE_SETTINGS;
}

let broadcastChannel: BroadcastChannel | null = null;
try {
  broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
} catch {}

export const useLiveConsoleSettingsStore = create<LiveConsoleSettingsState>((set, get) => {
  if (broadcastChannel) {
    broadcastChannel.onmessage = (event) => {
      if (event.data?.type === "LIVE_CONSOLE_SETTINGS_UPDATE") {
        set({ settings: event.data.settings });
      }
    };
  }

  return {
    settings: loadPersistedSettings(),

    setSettings: (updates) => {
      const updated = { ...get().settings, ...updates };
      set({ settings: updated });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      persistSeed(updated);
      get().broadcastState();
    },

    broadcastState: () => {
      try {
        broadcastChannel?.postMessage({
          type: "LIVE_CONSOLE_SETTINGS_UPDATE",
          settings: get().settings,
        });
      } catch {}
    },
  };
});
