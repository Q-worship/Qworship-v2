import { useLayoutEffect, type RefObject } from "react";

// The smallest factor the text may be shrunk to. It is far below anything readable on purpose:
// the point is that the whole text is ALWAYS inside the box, however long it is.
const MIN_FACTOR = 0.04;
const SEARCH_STEPS = 14;

/**
 * Does `measure` fit inside the VISIBLE area of `container`?
 *
 * The visible area is the container's content box: its padding is not usable space, and it is
 * where the container clips (overflow: hidden). Comparing against the container's whole box
 * (padding included) let a text that was up to twice the padding too tall count as "fitting",
 * and its last lines were then cut off. Layout sizes (clientHeight / scrollHeight) are used
 * rather than getBoundingClientRect() so an entrance animation that scales the box
 * (transform) cannot change the answer.
 */
export function fitsInside(container: HTMLElement, measure: HTMLElement): boolean {
  const style = getComputedStyle(container);
  const padX = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
  const padY = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
  const availWidth = container.clientWidth - padX;
  const availHeight = container.clientHeight - padY;
  // scroll* includes anything that spills out of the measured box (a word wider than the box).
  // An inline element reports 0 for them, so its box is used instead.
  const box = measure.getBoundingClientRect();
  const width = measure.scrollWidth || box.width;
  const height = measure.scrollHeight || box.height;
  return width <= availWidth + 1 && height <= availHeight + 1;
}

/**
 * The largest factor in [MIN_FACTOR, 1] for which `fits()` is true (1 when the text already fits
 * at its normal size). `apply` is left set to the answer.
 */
export function fitFactor(apply: (factor: number) => void, fits: () => boolean): number {
  apply(1);
  if (fits()) return 1;

  apply(MIN_FACTOR);
  // Nothing fits even at the smallest size: stay at the smallest rather than clipping
  if (!fits()) return MIN_FACTOR;

  let low = MIN_FACTOR; // always fits
  let high = 1; // never fits
  for (let i = 0; i < SEARCH_STEPS; i++) {
    const mid = (low + high) / 2;
    apply(mid);
    if (fits()) low = mid;
    else high = mid;
  }
  apply(low);
  return low;
}

// Reduces genuine font-size (never a CSS transform - transform: scale() blurs/garbles
// bold-italic serif text when scaled to extreme ratios, since the browser rasterizes at the
// original size and scales the bitmap down instead of re-rendering crisp glyphs at the target
// size) on whatever `applySize` controls, until `measureRef`'s rendered box fits inside the
// visible area of `containerRef` on both axes. It finds the LARGEST size that fits, so the text
// is as big as it can be while always being shown whole. Re-measures on container resize, when
// web fonts finish loading (a different font changes the text's height) and whenever `deps`
// change (text content, tier, font, box size...). Shared by the Live Presentation Settings
// preview and the real live console so a manually-resized box never clips text on one side but
// not the other.
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

    const run = () => {
      fitFactor(applySize, () => fitsInside(container, measure));
    };

    run();
    const observer = new ResizeObserver(run);
    observer.observe(container);

    // A font that arrives after the first measurement changes how tall the text is
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    let cancelled = false;
    const onFonts = () => {
      if (!cancelled) run();
    };
    fonts?.ready?.then(onFonts).catch(() => {});
    fonts?.addEventListener?.("loadingdone", onFonts);

    return () => {
      cancelled = true;
      observer.disconnect();
      fonts?.removeEventListener?.("loadingdone", onFonts);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
