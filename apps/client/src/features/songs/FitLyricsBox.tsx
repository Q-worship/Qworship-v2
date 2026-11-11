import React, { useRef } from "react";
import { useAutoFitTextSize } from "@/hooks/useAutoFitTextSize";

/**
 * Fills its parent and shrinks the lyrics until the whole text fits, so a long verse is never
 * cut off at the bottom. At the normal size nothing changes; the size only goes down when the
 * text would not fit. The lyrics element is handed to `children` so the size can be applied
 * to it.
 */
export const FitLyricsBox: React.FC<{
  /** The lyrics' normal font size, e.g. "3rem" */
  baseSize: string;
  /** Anything that changes what is shown (the text, the font ...) so the fit is redone */
  deps: unknown[];
  children: (contentRef: React.RefObject<HTMLDivElement>) => React.ReactNode;
}> = ({ baseSize, deps, children }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useAutoFitTextSize(
    boxRef,
    measureRef,
    (factor) => {
      if (contentRef.current) {
        contentRef.current.style.fontSize = factor >= 1 ? baseSize : `calc(${baseSize} * ${factor})`;
      }
    },
    [baseSize, ...deps],
  );

  return (
    <div ref={boxRef} className="w-full h-full flex flex-col items-center justify-center overflow-hidden">
      <div ref={measureRef} className="w-full flex flex-col items-center">
        {children(contentRef)}
      </div>
    </div>
  );
};
