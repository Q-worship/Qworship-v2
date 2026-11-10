import React, { forwardRef, useCallback, useLayoutEffect, useRef } from "react";

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** The textarea is never shorter than this (px) */
  minHeight?: number;
};

/**
 * A textarea that is always as tall as its text, so a long verse is shown whole instead of
 * being cut off behind an inner scrollbar. It is resized after every render (new text, new
 * font), when its width changes (the text wraps differently) and when web fonts arrive.
 */
export const AutoGrowTextarea = forwardRef<HTMLTextAreaElement, Props>(
  ({ minHeight = 128, style, ...rest }, forwardedRef) => {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);

    const setRefs = useCallback(
      (element: HTMLTextAreaElement | null) => {
        innerRef.current = element;
        if (typeof forwardedRef === "function") forwardedRef(element);
        else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = element;
      },
      [forwardedRef],
    );

    const grow = useCallback(() => {
      const element = innerRef.current;
      if (!element) return;
      element.style.height = "auto";
      element.style.height = `${Math.max(minHeight, element.scrollHeight)}px`;
    }, [minHeight]);

    // After every render: the text, the font or the style may have changed
    useLayoutEffect(grow);

    useLayoutEffect(() => {
      const element = innerRef.current;
      if (!element) return;

      let lastWidth = element.clientWidth;
      const observer = new ResizeObserver(() => {
        // Only a change of width changes how the text wraps (height is what this sets)
        if (element.clientWidth !== lastWidth) {
          lastWidth = element.clientWidth;
          grow();
        }
      });
      observer.observe(element);

      const fonts = typeof document !== "undefined" ? document.fonts : undefined;
      let cancelled = false;
      const onFonts = () => {
        if (!cancelled) grow();
      };
      fonts?.ready?.then(onFonts).catch(() => {});
      fonts?.addEventListener?.("loadingdone", onFonts);

      return () => {
        cancelled = true;
        observer.disconnect();
        fonts?.removeEventListener?.("loadingdone", onFonts);
      };
    }, [grow]);

    return <textarea ref={setRefs} style={{ ...style, overflow: "hidden" }} {...rest} />;
  },
);
AutoGrowTextarea.displayName = "AutoGrowTextarea";
