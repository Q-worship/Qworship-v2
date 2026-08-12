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

function persistSeed(settings: LiveConsoleSettings) {
  try {
    localStorage.setItem(LIVE_WINDOW_SEED_KEY, JSON.stringify(settings));
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
