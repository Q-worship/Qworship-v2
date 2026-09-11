// Ambient types for the Window Management API (getScreenDetails, ScreenDetails,
// ScreenDetailed, and the { screen } option on Element.requestFullscreen).
// This is an experimental, Chromium-only API not yet part of TypeScript's
// built-in DOM lib, so it's declared here for the external-display-detection
// feature (features/dashboard/hooks/useExternalDisplayDetection.ts).
// Spec: https://w3c.github.io/window-management/

export {};

declare global {
  interface ScreenDetailed extends Screen {
    availLeft: number;
    availTop: number;
    left: number;
    top: number;
    isPrimary: boolean;
    isInternal: boolean;
    devicePixelRatio: number;
    label: string;
  }

  interface ScreenDetails extends EventTarget {
    screens: ScreenDetailed[];
    currentScreen: ScreenDetailed;
    addEventListener(
      type: "screenschange" | "currentscreenchange",
      listener: (this: ScreenDetails, ev: Event) => void,
    ): void;
    removeEventListener(
      type: "screenschange" | "currentscreenchange",
      listener: (this: ScreenDetails, ev: Event) => void,
    ): void;
  }

  interface Window {
    getScreenDetails?: () => Promise<ScreenDetails>;
  }

  interface Screen {
    isExtended?: boolean;
  }

  interface FullscreenOptions {
    screen?: ScreenDetailed;
  }
}
