import React, { useRef, useEffect, useState } from "react";
import { resolveMediaUrl } from "@/lib/queryClient";

export const SlideCanvasRenderer = ({
  content,
  background,
  scaleMode = "contain",
}: {
  content: any;
  background?: any;
  scaleMode?: "contain" | "cover";
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const CANVAS_WIDTH = 960;
  const CANVAS_HEIGHT = 540;

  const parseStringContent = (value: string): any => {
    const trimmed = value.trim();
    if (!trimmed || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) {
      return null;
    }
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  };

  const isCanvasShape = (value: any): boolean =>
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (Array.isArray(value.elements) ||
      !!value.canvasBackground ||
      !!value.background ||
      !!value.backgroundImage);

  const maybeNormalizeLegacyElementAnchoring = (rawElements: any[]): any[] => {
    if (!Array.isArray(rawElements) || rawElements.length === 0) return rawElements || [];

    const numericElements = rawElements.filter(
      (el) =>
        el &&
        typeof el.x === "number" &&
        typeof el.y === "number" &&
        typeof el.width === "number" &&
        typeof el.height === "number",
    );
    if (!numericElements.length) return rawElements;

    const overflowScore = (asCentered: boolean) =>
      numericElements.reduce((sum, el) => {
        const left = asCentered ? el.x - el.width / 2 : el.x;
        const top = asCentered ? el.y - el.height / 2 : el.y;
        const right = left + el.width;
        const bottom = top + el.height;
        const overflowX = Math.max(0, -left) + Math.max(0, right - CANVAS_WIDTH);
        const overflowY = Math.max(0, -top) + Math.max(0, bottom - CANVAS_HEIGHT);
        return sum + overflowX + overflowY;
      }, 0);

    const topLeftScore = overflowScore(false);
    const centeredScore = overflowScore(true);
    const shouldConvertFromCenter =
      topLeftScore > 120 && centeredScore < topLeftScore * 0.65;

    if (!shouldConvertFromCenter) return rawElements;

    return rawElements.map((el) => {
      if (
        !el ||
        typeof el.x !== "number" ||
        typeof el.y !== "number" ||
        typeof el.width !== "number" ||
        typeof el.height !== "number"
      ) {
        return el;
      }

      return {
        ...el,
        x: el.x - el.width / 2,
        y: el.y - el.height / 2,
      };
    });
  };

  const maybeReframeShiftedLayout = (rawElements: any[]): any[] => {
    if (!Array.isArray(rawElements) || rawElements.length === 0) return rawElements || [];

    const positioned = rawElements.filter(
      (el) =>
        el &&
        typeof el.x === "number" &&
        typeof el.y === "number" &&
        typeof el.width === "number" &&
        typeof el.height === "number",
    );
    if (!positioned.length) return rawElements;

    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    for (const el of positioned) {
      left = Math.min(left, el.x);
      top = Math.min(top, el.y);
      right = Math.max(right, el.x + el.width);
      bottom = Math.max(bottom, el.y + el.height);
    }

    const layoutWidth = right - left;
    const layoutHeight = bottom - top;
    if (layoutWidth <= 0 || layoutHeight <= 0) return rawElements;
    if (layoutWidth > CANVAS_WIDTH * 1.25 || layoutHeight > CANVAS_HEIGHT * 1.25) {
      return rawElements;
    }

    const overflowLeft = Math.max(0, -left);
    const overflowTop = Math.max(0, -top);
    const overflowRight = Math.max(0, right - CANVAS_WIDTH);
    const overflowBottom = Math.max(0, bottom - CANVAS_HEIGHT);
    const totalOverflow = overflowLeft + overflowTop + overflowRight + overflowBottom;

    let dx = 0;
    let dy = 0;

    if (left < 0 && right > CANVAS_WIDTH) {
      dx = CANVAS_WIDTH / 2 - (left + right) / 2;
    } else if (left < 0) {
      dx = -left;
    } else if (right > CANVAS_WIDTH) {
      dx = CANVAS_WIDTH - right;
    }

    if (top < 0 && bottom > CANVAS_HEIGHT) {
      dy = CANVAS_HEIGHT / 2 - (top + bottom) / 2;
    } else if (top < 0) {
      dy = -top;
    } else if (bottom > CANVAS_HEIGHT) {
      dy = CANVAS_HEIGHT - bottom;
    }

    const layoutCenterX = (left + right) / 2;
    const layoutCenterY = (top + bottom) / 2;
    const centerDeltaX = CANVAS_WIDTH / 2 - layoutCenterX;
    const centerDeltaY = CANVAS_HEIGHT / 2 - layoutCenterY;
    const hasMeaningfulCenterDrift =
      Math.abs(centerDeltaX) > 28 || Math.abs(centerDeltaY) > 22;
    const canCenterWithoutCropping =
      left + centerDeltaX >= -12 &&
      top + centerDeltaY >= -12 &&
      right + centerDeltaX <= CANVAS_WIDTH + 12 &&
      bottom + centerDeltaY <= CANVAS_HEIGHT + 12;

    if ((dx === 0 && dy === 0) && totalOverflow < 80) {
      if (!(hasMeaningfulCenterDrift && canCenterWithoutCropping)) return rawElements;
      dx = centerDeltaX;
      dy = centerDeltaY;
    }

    if (dx === 0 && dy === 0) return rawElements;

    return rawElements.map((el) => {
      if (
        !el ||
        typeof el.x !== "number" ||
        typeof el.y !== "number" ||
        typeof el.width !== "number" ||
        typeof el.height !== "number"
      ) {
        return el;
      }
      return {
        ...el,
        x: el.x + dx,
        y: el.y + dy,
      };
    });
  };

  const extractCanvasPayload = (raw: any, depth = 0): any => {
    if (!raw || depth > 5) return null;

    if (typeof raw === "string") {
      const parsed = parseStringContent(raw);
      if (!parsed) return raw;
      return extractCanvasPayload(parsed, depth + 1);
    }

    if (typeof raw !== "object" || Array.isArray(raw)) {
      return raw;
    }

    if (isCanvasShape(raw)) {
      return raw;
    }

    // Common wrapper shapes seen in live sync paths.
    const nestedCandidates = [raw.content, raw.slide, raw.data, raw.payload];
    for (const candidate of nestedCandidates) {
      const extracted = extractCanvasPayload(candidate, depth + 1);
      if (isCanvasShape(extracted) || typeof extracted === "string") {
        return extracted;
      }
    }

    // Slide objects can carry canvas in slide.content.
    if (raw.slide && typeof raw.slide === "object" && !Array.isArray(raw.slide)) {
      const extracted = extractCanvasPayload(raw.slide.content, depth + 1);
      if (isCanvasShape(extracted) || typeof extracted === "string") {
        return extracted;
      }
    }

    return raw;
  };

  useEffect(() => {
    const updateScale = () => {
      const container = containerRef.current;
      if (!container) return;

      const { width, height } = container.getBoundingClientRect();

      if (width > 0 && height > 0) {
        const widthScale = width / CANVAS_WIDTH;
        const heightScale = height / CANVAS_HEIGHT;
        setScale(scaleMode === "cover" ? Math.max(widthScale, heightScale) : Math.min(widthScale, heightScale));
        return;
      }

      if (width > 0) {
        setScale(width / CANVAS_WIDTH);
        return;
      }

      if (height > 0) {
        setScale(height / CANVAS_HEIGHT);
      }
    };

    updateScale();
    // Re-run after layout settles so tiny first paint is avoided.
    const rafId = window.requestAnimationFrame(updateScale);
    const timeoutId = window.setTimeout(updateScale, 120);

    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
    };
  }, [scaleMode]);

  let elements = [];
  let canvasBackground = { type: 'color', value: '#101017' };

  const normalizedContent = extractCanvasPayload(content);

  if (typeof normalizedContent === 'string') {
    try {
      // Basic check to see if it looks like JSON before parsing
      if (normalizedContent.trim().startsWith('{') || normalizedContent.trim().startsWith('[')) {
        const parsed = JSON.parse(normalizedContent);
        elements = maybeReframeShiftedLayout(
          maybeNormalizeLegacyElementAnchoring(parsed.elements || []),
        );
        canvasBackground = parsed.background || parsed.canvasBackground || canvasBackground;
      } else {
        // If it's a plain string, we could optionally render it as a single text element
        // or just ignore it. Let's create a temporary text element if it's not JSON.
        elements = maybeReframeShiftedLayout(maybeNormalizeLegacyElementAnchoring([{
          id: 'temp-fallback',
          type: 'text',
          layerName: 'Fallback Text',
          x: 480, y: 270, width: 800, height: 100,
          rotation: 0, opacity: 100, locked: true, hidden: false,
          content: normalizedContent,
          color: '#ffffff',
          fontSize: 32,
          textAlign: 'center',
          alignVertical: 'middle',
          fontWeight: 'normal',
          dropShadow: true
        }]));
      }
    } catch (e) {
      console.error('Failed to parse canvas content', e);
    }
  } else if (normalizedContent && typeof normalizedContent === 'object') {
    elements = maybeReframeShiftedLayout(
      maybeNormalizeLegacyElementAnchoring(normalizedContent.elements || []),
    );
    canvasBackground =
      normalizedContent.canvasBackground ||
      normalizedContent.background ||
      // Legacy field compatibility in case some flow still stores this shape.
      (normalizedContent.backgroundImage
        ? { type: "image", value: normalizedContent.backgroundImage }
        : null) ||
      canvasBackground;
  }

  // Only override if the parent explicitly passes a non-transparent background
  if (background && background.type && background.type !== 'transparent') {
    canvasBackground = background;
  }

  // resolve image URLs for background
  let bgUrl = canvasBackground?.value;
  if (canvasBackground?.type === 'image' && bgUrl) {
    bgUrl = resolveMediaUrl(bgUrl) || bgUrl;
  }

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden flex items-center justify-center bg-black">
      <div 
        className="transform-origin-center absolute bg-black shrink-0 pointer-events-none"
        style={{
          width: `${CANVAS_WIDTH}px`,
          height: `${CANVAS_HEIGHT}px`,
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${scale})`,
          backgroundColor: canvasBackground.type === 'color' ? canvasBackground.value : canvasBackground.type === 'transparent' ? '#000000' : 'transparent',
          backgroundImage: canvasBackground.type === 'image' ? `url("${bgUrl}")` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transformOrigin: 'center center'
        }}
      >
         {elements.map((el: any) => {
            if (el.hidden) return null;
            
            let textShadow = "none";
            if (el.dropShadow) textShadow = "2px 2px 4px rgba(0,0,0,0.5)";
            if (el.stroke) textShadow = "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000";

            // Resolve image source
            let contentSrc = el.content;
            if (el.type === 'image' && contentSrc) {
               contentSrc = resolveMediaUrl(contentSrc) || contentSrc;
            }

            return (
              <div
                key={el.id}
                className="absolute"
                style={{
                  left: `${el.x}px`,
                  top: `${el.y}px`,
                  width: `${el.width}px`,
                  height: `${el.height}px`,
                  backgroundColor: el.type === 'rect' ? el.color : 'transparent',
                  opacity: el.opacity / 100,
                  transform: `rotate(${el.rotation}deg)`,
                  display: 'flex',
                  alignItems: el.alignVertical === 'top' ? 'flex-start' : el.alignVertical === 'bottom' ? 'flex-end' : 'center',
                  justifyContent: 'center',
                  userSelect: 'none',
                  borderRadius: el.backgroundShape ? '50%' : '0',
                  clipPath: el.shapeType === 'triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : el.shapeType === 'star' ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' : 'none',
                }}
              >
                 {el.type === 'text' && (
                    <div 
                      className="w-full break-words"
                      style={{
                         fontFamily: el.fontFamily || "Inter",
                         fontSize: `${el.fontSize}px`,
                         fontWeight: el.fontWeight || "Normal",
                         color: el.color || "#FFFFFF",
                         textAlign: el.textAlign || "center",
                         lineHeight: el.lineHeight || 1.2,
                         letterSpacing: `${el.letterSpacing || 0}px`,
                         textShadow: textShadow,
                      }}
                    >
                       {el.content}
                    </div>
                 )}

                 {el.type === 'image' && (
                    <img src={contentSrc} alt={el.layerName} className="w-full h-full object-cover select-none pointer-events-none" />
                 )}
              </div>
            )
         })}
      </div>
    </div>
  );
};
