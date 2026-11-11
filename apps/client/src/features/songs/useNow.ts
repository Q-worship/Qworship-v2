import { useEffect, useState } from "react";

/**
 * The current time, refreshed every `intervalMs` (and when the tab becomes visible again), so
 * text like "Edited 5 min ago" keeps itself up to date while it is on screen.
 */
export const useNow = (intervalMs = 30_000): number => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);

  return now;
};
