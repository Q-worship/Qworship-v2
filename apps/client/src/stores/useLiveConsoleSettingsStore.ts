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
  bold: boolean;
  italic: boolean;
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
  bold: false,
  italic: false,
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
  bold: boolean;
  italic: boolean;
}

export function toLiveWindowSeed(settings: LiveConsoleSettings): LiveWindowSeed {
  const base = {
    hideTextBox: settings.hideTextBox,
    fontFamily: settings.fontFamily,
    fontColor: settings.fontColor,
    textSize: settings.textSize,
    bold: settings.bold,
    italic: settings.italic,
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

// ── Default (idle) Web Screen — the "Live Service / Now presenting..."
// screen shown on the GO LIVE console when no slide/song/verse is active.
// Same shape as LiveConsoleSettings minus hideTextBox (the default screen
// has no slide text box to strip).
export interface DefaultScreenSettings {
  backgroundType: "solid" | "gradient" | "media";
  backgroundValue: string;
  backgroundMediaType?: "image" | "video";
  backgroundMediaId?: string;
  backgroundMediaSource?: "user" | "cloud";
  fontColor: string;
  fontFamily: string;
  textSize: LiveConsoleTextSize;
  bold: boolean;
  italic: boolean;
  // Editable directly in the preview panel (LivePresentationSettingsPage) -
  // what actually renders as the idle screen's title/subtitle.
  title: string;
  description: string;
  // Per-element visibility - hidden elements render nowhere (preview or
  // live), not just visually dimmed. Restorable from the preview's "reveal
  // hidden" eye toggle.
  titleHidden: boolean;
  descriptionHidden: boolean;
  liveBadgeHidden: boolean;
  slideCounterHidden: boolean;
  // Manual box size overrides, as a % of the preview/live screen's own
  // width/height, set by dragging the resize handles in the preview.
  // Undefined = natural/auto sizing.
  titleBoxWidthPct?: number;
  titleBoxHeightPct?: number;
  descriptionBoxWidthPct?: number;
  descriptionBoxHeightPct?: number;
  // Which quick preset is currently applied - drives the Presets dropdown's
  // displayed value; purely a UI convenience, doesn't affect rendering.
  preset: "default" | "blank";
}

export const DEFAULT_DEFAULT_SCREEN_SETTINGS: DefaultScreenSettings = {
  backgroundType: "solid",
  backgroundValue: "#000000",
  backgroundMediaType: undefined,
  backgroundMediaId: undefined,
  backgroundMediaSource: undefined,
  fontColor: "#ffffff",
  fontFamily: "Inter, sans-serif",
  textSize: "6x-extra-large",
  bold: true,
  italic: false,
  title: "Live Service",
  description: "Now presenting live to congregation",
  titleHidden: false,
  descriptionHidden: false,
  liveBadgeHidden: false,
  slideCounterHidden: false,
  titleBoxWidthPct: undefined,
  titleBoxHeightPct: undefined,
  descriptionBoxWidthPct: undefined,
  descriptionBoxHeightPct: undefined,
  preset: "default",
};

// The "Blank Canvas" preset - a bare black screen with the default text and
// LIVE badge hidden, ready to be built on from scratch.
export const BLANK_CANVAS_SCREEN_SETTINGS: DefaultScreenSettings = {
  ...DEFAULT_DEFAULT_SCREEN_SETTINGS,
  backgroundType: "solid",
  backgroundValue: "#000000",
  backgroundMediaType: undefined,
  backgroundMediaId: undefined,
  backgroundMediaSource: undefined,
  titleHidden: true,
  descriptionHidden: true,
  liveBadgeHidden: true,
  slideCounterHidden: true,
  preset: "blank",
};

const DEFAULT_SCREEN_STORAGE_KEY = "qworship-default-screen-settings-page";
const DEFAULT_SCREEN_SEED_KEY = "qworship-default-screen-seed";

export interface DefaultScreenSeed {
  backgroundType: "color" | "image" | "video";
  backgroundColor: string;
  backgroundImage: string | null;
  backgroundVideo: string | null;
  fontFamily: string;
  fontColor: string;
  textSize: LiveConsoleTextSize;
  bold: boolean;
  italic: boolean;
  title: string;
  description: string;
  titleHidden: boolean;
  descriptionHidden: boolean;
  liveBadgeHidden: boolean;
  slideCounterHidden: boolean;
  titleBoxWidthPct?: number;
  titleBoxHeightPct?: number;
  descriptionBoxWidthPct?: number;
  descriptionBoxHeightPct?: number;
}

export function toDefaultScreenSeed(settings: DefaultScreenSettings): DefaultScreenSeed {
  const base = {
    fontFamily: settings.fontFamily,
    fontColor: settings.fontColor,
    textSize: settings.textSize,
    bold: settings.bold,
    italic: settings.italic,
    title: settings.title,
    description: settings.description,
    titleHidden: settings.titleHidden,
    descriptionHidden: settings.descriptionHidden,
    liveBadgeHidden: settings.liveBadgeHidden,
    slideCounterHidden: settings.slideCounterHidden,
    titleBoxWidthPct: settings.titleBoxWidthPct,
    titleBoxHeightPct: settings.titleBoxHeightPct,
    descriptionBoxWidthPct: settings.descriptionBoxWidthPct,
    descriptionBoxHeightPct: settings.descriptionBoxHeightPct,
  };

  if (settings.backgroundType === "media") {
    return settings.backgroundMediaType === "video"
      ? { ...base, backgroundType: "video", backgroundColor: "#000000", backgroundImage: null, backgroundVideo: settings.backgroundValue }
      : { ...base, backgroundType: "image", backgroundColor: "#000000", backgroundImage: settings.backgroundValue, backgroundVideo: null };
  }

  return { ...base, backgroundType: "color", backgroundColor: settings.backgroundValue, backgroundImage: null, backgroundVideo: null };
}

function persistDefaultScreenSeed(settings: DefaultScreenSettings) {
  try {
    localStorage.setItem(DEFAULT_SCREEN_SEED_KEY, JSON.stringify(toDefaultScreenSeed(settings)));
  } catch {}
}

function loadPersistedDefaultScreenSettings(): DefaultScreenSettings {
  try {
    const stored = localStorage.getItem(DEFAULT_SCREEN_STORAGE_KEY);
    if (stored) return { ...DEFAULT_DEFAULT_SCREEN_SETTINGS, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_DEFAULT_SCREEN_SETTINGS;
}

interface LiveConsoleSettingsState {
  settings: LiveConsoleSettings;
  setSettings: (updates: Partial<LiveConsoleSettings>) => void;
  broadcastState: () => void;
  defaultScreenSettings: DefaultScreenSettings;
  setDefaultScreenSettings: (updates: Partial<DefaultScreenSettings>) => void;
  broadcastDefaultScreenState: () => void;
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
      } else if (event.data?.type === "DEFAULT_SCREEN_SETTINGS_UPDATE") {
        set({ defaultScreenSettings: event.data.settings });
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

    defaultScreenSettings: loadPersistedDefaultScreenSettings(),

    setDefaultScreenSettings: (updates) => {
      const updated = { ...get().defaultScreenSettings, ...updates };
      set({ defaultScreenSettings: updated });
      try {
        localStorage.setItem(DEFAULT_SCREEN_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      persistDefaultScreenSeed(updated);
      get().broadcastDefaultScreenState();
    },

    broadcastDefaultScreenState: () => {
      try {
        broadcastChannel?.postMessage({
          type: "DEFAULT_SCREEN_SETTINGS_UPDATE",
          settings: get().defaultScreenSettings,
        });
      } catch {}
    },
  };
});
