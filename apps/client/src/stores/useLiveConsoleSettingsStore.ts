import { create } from "zustand";

// Matches the live console's own slideTextSize preset scale exactly
// (features/dashboard/live/useLivePresentationState.ts's getTextSizeClass),
// so a choice here maps 1:1 onto a real live-console size with no lossy
// px-range conversion.
export type LiveConsoleTextSize =
  | "small"
  | "medium"
  | "large"
  | "extra-large"
  | "2x-extra-large"
  | "3x-extra-large"
  | "4x-extra-large"
  | "5x-extra-large"
  | "6x-extra-large";

export interface LiveConsoleSettings {
  backgroundType: "solid" | "gradient" | "media";
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
  textSize: LiveConsoleTextSize;
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
  textSize: "large",
};

const STORAGE_KEY = "qworship-live-console-settings-page";
// Live console windows (features/dashboard/live/useLivePresentationState.ts)
// subscribe to this same channel directly, so a change here applies
// instantly to any already-open live screen - not just the next GO LIVE.
const CHANNEL_NAME = "qworship-live-console-settings-sync";

// Also written on every change so a *freshly opened* live window (which
// hasn't received any broadcast yet) starts with these values immediately,
// without needing to wait for the dashboard tab to be open and broadcasting.
const LIVE_WINDOW_SEED_KEY = "qworship-live-console-seed";

export interface LiveWindowSeed {
  backgroundType: "color" | "image" | "video";
  backgroundColor: string;
  backgroundImage: string | null;
  backgroundVideo: string | null;
  hideTextBox: boolean;
  fontFamily: string;
  fontColor: string;
  textSize: LiveConsoleTextSize;
}

export function toLiveWindowSeed(settings: LiveConsoleSettings): LiveWindowSeed {
  const base = {
    hideTextBox: settings.hideTextBox,
    fontFamily: settings.fontFamily,
    fontColor: settings.fontColor,
    textSize: settings.textSize,
  };

  if (settings.backgroundType === "media") {
    return settings.backgroundMediaType === "video"
      ? { ...base, backgroundType: "video", backgroundColor: "#000000", backgroundImage: null, backgroundVideo: settings.backgroundValue }
      : { ...base, backgroundType: "image", backgroundColor: "#000000", backgroundImage: settings.backgroundValue, backgroundVideo: null };
  }

  // "solid" and "gradient" both flow through the live console's "color"
  // slot - getBackgroundStyle() there renders a value starting with
  // "linear-gradient" as a backgroundImage instead of a flat backgroundColor.
  return { ...base, backgroundType: "color", backgroundColor: settings.backgroundValue, backgroundImage: null, backgroundVideo: null };
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
