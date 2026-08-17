import { useLayoutEffect, type RefObject } from "react";

// Iteratively reduces genuine font-size (never a CSS transform - transform:
// scale() blurs/garbles bold-italic serif text when scaled to extreme
// ratios, since the browser rasterizes at the original size and scales the
// bitmap down instead of re-rendering crisp glyphs at the target size) on
// whatever `applySize` controls, until `measureRef`'s rendered box fits
// inside `containerRef` on both axes. Re-measures on container resize and
// whenever `deps` change (text content, tier, font, box size...). Shared by
// the Live Presentation Settings preview and the real live console so a
// manually-resized box never clips text on one side but not the other.
export function useAutoFitTextSize(
  containerRef: RefObject<HTMLElement>,
  measureRef: RefObject<HTMLElement>,
  applySize: (factor: number) => void,
  deps: unknown[],
) {
  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const fits = () => {
      const c = container.getBoundingClientRect();
      const m = measure.getBoundingClientRect();
      return m.width <= c.width + 0.5 && m.height <= c.height + 0.5;
    };

    const run = () => {
      let factor = 1;
      applySize(factor);
      let guard = 0;
      while (!fits() && factor > 0.15 && guard < 60) {
        factor = Math.max(0.15, factor - 0.03);
        applySize(factor);
        guard++;
      }
    };

    run();
    const observer = new ResizeObserver(run);
    observer.observe(container);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
