/**
 * LowerThirdRenderer
 *
 * Architecture:
 *  • Every text element gets an OUTER fixed-size container div (absolute,
 *    percentage-based dimensions derived from the template canvas).
 *  • fitty is attached to the INNER text div — it reads the outer container's
 *    pixel width and scales font-size to snugly fill that space.
 *  • min/maxSize come from the element's fontSizeMin/fontSizeMax (16–200 range).
 *  • Shape elements are unchanged — plain absolute divs.
 */

import { useEffect, useRef, useState } from "react";
import { X as XIcon } from "lucide-react";

import type {
  LowerThirdTemplate,
  LowerThirdElement,
  LowerThirdBindingData,
} from "./types";

// ─── helpers ──────────────────────────────────────────────────────────────────

function resolveText(
  element: LowerThirdElement,
  data: LowerThirdBindingData,
): string {
  // Composite (merged) binding takes priority
  if (element.compositeBinding && element.compositeBinding.length > 0) {
    return element.compositeBinding
      .map((part) => {
        const value = data[part.field as keyof LowerThirdBindingData] as string | undefined;
        if (!value) return "";
        return `${part.prefix ?? ""}${value}${part.suffix ?? ""}`;
      })
      .join("");
  }
  // Single-field binding
  if (element.binding) {
    const value = data[element.binding.field as keyof LowerThirdBindingData];
    return (value as string) || element.binding.placeholder || element.text || "";
  }
  return element.text || "";
}

function getAnimationStyle(
  element: LowerThirdElement,
  isVisible: boolean,
  isPreview: boolean,
): React.CSSProperties {
  if (isPreview || !element.animation || element.animation.type === "none") {
    return { opacity: 1, transform: "none" };
  }

  if (!isVisible) {
    return { opacity: 0, transform: "translateY(16px) scale(0.97)" };
  }

  const { type, duration, delay, easing } = element.animation;
  const transition = `opacity ${duration}ms ${easing} ${delay}ms, transform ${duration}ms ${easing} ${delay}ms`;

  const visible: React.CSSProperties = {
    opacity: 1,
    transform: "none",
    transition,
  };

  switch (type) {
    case "slideIn":
      return { ...visible, transform: "translateY(0)", transition };
    case "scaleIn":
      return { ...visible, transform: "scale(1)", transition };
    case "rotateIn":
      return { ...visible, transform: "rotate(0) scale(1)", transition };
    default:
      return visible;
  }
}

// ─── SmartTextElement ─────────────────────────────────────────────────────────

interface SmartTextElementProps {
  element: LowerThirdElement;
  text: string;
  isVisible: boolean;
  isPreview: boolean;
}

function SmartTextElement({
  element,
  text,
  isVisible,
  isPreview,
}: SmartTextElementProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const defaultSize = element.fontSizeMax ?? element.fontSize ?? 48;
  const [fontSize, setFontSize] = useState(defaultSize);

  // Intelligent text scaling based on container bounds
  useEffect(() => {
    const container = containerRef.current;
    const textNode = textRef.current;
    if (!container || !textNode) return;

    if (!element.fontSizeDynamic) {
      setFontSize(defaultSize);
      return;
    }

    const minSize = element.fontSizeMin ?? 16;
    const maxSize = defaultSize;

    // Remove clamping temporarily to measure true overflow
    const originalClamp = textNode.style.getPropertyValue("-webkit-line-clamp");
    const originalDisplay = textNode.style.getPropertyValue("display");

    textNode.style.setProperty("-webkit-line-clamp", "unset");
    textNode.style.setProperty("display", "block");

    let min = minSize;
    let max = maxSize;
    let best = minSize;

    while (min <= max) {
      const mid = Math.floor((min + max) / 2);
      textNode.style.fontSize = `${mid}px`;

      const isOverflowing =
        textNode.scrollHeight > container.clientHeight ||
        textNode.scrollWidth > container.clientWidth;

      if (isOverflowing) {
        max = mid - 1;
      } else {
        best = mid;
        min = mid + 1;
      }
    }

    // Restore clamp
    if (originalDisplay) {
      textNode.style.setProperty("display", originalDisplay);
    }
    if (originalClamp) {
      textNode.style.setProperty("-webkit-line-clamp", originalClamp);
    }

    setFontSize(best);
  }, [
    text,
    element.fontSizeDynamic,
    element.fontSizeMin,
    defaultSize,
    element.width,
    element.height,
  ]);

  const animStyle = getAnimationStyle(element, isVisible, isPreview);

  // Map alignment perfectly for Flexbox
  const alignItems =
    element.textAlign === "center"
      ? "center"
      : element.textAlign === "right"
        ? "flex-end"
        : "flex-start";

  return (
    /* ── OUTER: fixed-size slot ────────────────────────────────────────────── */
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        left: `${element.x}%`,
        top: `${element.y}%`,
        width: `${element.width}%`,
        height: `${element.height}%`,
        overflow: "hidden",
        display: element.visible ? "flex" : "none",
        flexDirection: "column",
        justifyContent: "center", // Vertically center the text block
        alignItems: alignItems,
        zIndex: element.zIndex,
        ...animStyle,
      }}>
      {/* ── INNER: intelligently scaled target ─────────────────────────────── */}
      <div
        ref={textRef}
        style={{
          width: "100%",
          fontFamily: element.fontFamily || "Inter, sans-serif",
          fontWeight: element.fontWeight || 700,
          fontStyle: element.fontStyle || "normal",
          color: element.textColor || "#ffffff",
          textAlign: element.textAlign || "left",
          lineHeight: element.lineHeight || 1.3,
          letterSpacing: element.letterSpacing
            ? `${element.letterSpacing}px`
            : undefined,
          whiteSpace:
            element.textOverflow === "truncate" ? "nowrap" : "pre-wrap",
          wordBreak: "break-word",
          fontSize: `${fontSize}px`,

          // Truncation rules
          display: element.lineClamp ? "-webkit-box" : "block",
          WebkitLineClamp: element.lineClamp,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>
        {text}
      </div>
    </div>
  );
}

// ─── ShapeElement ─────────────────────────────────────────────────────────────

function ShapeElement({
  element,
  isVisible,
  isPreview,
  isEditable,
  isSelected,
  onSelect,
}: {
  element: LowerThirdElement;
  isVisible: boolean;
  isPreview: boolean;
  isEditable?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}) {
  const animStyle = getAnimationStyle(element, isVisible, isPreview);
  const hasBgImage = !!element.backgroundImage;

  return (
    <div
      onClick={
        isEditable
          ? (e) => {
              e.stopPropagation();
              onSelect?.(element.id);
            }
          : undefined
      }
      style={{
        position: "absolute",
        left: `${element.x}%`,
        top: `${element.y}%`,
        width: `${element.width}%`,
        height: `${element.height}%`,
        cursor: isEditable ? "pointer" : undefined,
        outline: isEditable && isSelected ? "1.5px dashed #a855f7" : undefined,
        outlineOffset: isEditable && isSelected ? "1px" : undefined,
        // Deliberately never uses the `background` shorthand alongside these
        // longhands: per the CSSOM spec, clearing a shorthand (e.g. setting
        // it to "" when its value is undefined) cascades and clears ALL of
        // its longhand sub-properties too - including a `backgroundColor`
        // that was just set moments earlier in this same style object. A
        // CSS gradient is a valid `background-image` value on its own, so
        // there's no need for the shorthand at all.
        //
        // backgroundColor is kept as a fallback layer even when there's an
        // image fill: CSS paints background-color first and
        // background-image on top of it, so a fully-loaded image still
        // covers it completely - but if the image URL ever fails to load
        // (broken link, network hiccup), the shape stays visible with its
        // colour instead of silently going fully transparent.
        backgroundColor: element.gradient
          ? undefined
          : element.backgroundColor || (hasBgImage ? undefined : "transparent"),
        // Image fill - a CSS background is inherently clipped to this div's
        // own box, so it's always cropped to fit the shape, never larger.
        backgroundImage: hasBgImage
          ? `url(${element.backgroundImage})`
          : element.gradient || undefined,
        backgroundPosition: hasBgImage
          ? `${element.backgroundImagePosX ?? 50}% ${element.backgroundImagePosY ?? 50}%`
          : undefined,
        backgroundSize: hasBgImage
          ? `${(element.backgroundImageScale ?? 1) * 100}%`
          : undefined,
        backgroundRepeat: hasBgImage ? "no-repeat" : undefined,
        borderColor: element.borderColor,
        borderWidth: element.borderWidth
          ? `${element.borderWidth}px`
          : undefined,
        borderStyle: element.borderWidth ? "solid" : undefined,
        borderRadius: element.borderRadius
          ? `${element.borderRadius}px`
          : undefined,
        opacity: element.opacity ?? 1,
        boxShadow: element.boxShadow,
        clipPath: element.clipPath,
        transform: element.transform,
        zIndex: element.zIndex,
        display: element.visible ? "block" : "none",
        ...animStyle,
      }}
    />
  );
}

// ─── ImageElement ─────────────────────────────────────────────────────────────

function ImageElement({
  element,
  isVisible,
  isPreview,
  isEditable,
  isSelected,
  canvasRef,
  onSelect,
  onMove,
  onResize,
  onDelete,
}: {
  element: LowerThirdElement;
  isVisible: boolean;
  isPreview: boolean;
  isEditable?: boolean;
  isSelected?: boolean;
  canvasRef?: React.RefObject<HTMLElement>;
  onSelect?: (id: string) => void;
  onMove?: (id: string, x: number, y: number) => void;
  onResize?: (id: string, x: number, y: number, width: number, height: number) => void;
  onDelete?: (id: string) => void;
}) {
  const animStyle = getAnimationStyle(element, isVisible, isPreview);
  const imgRef = useRef<HTMLImageElement>(null);

  // Editor-only: drag anywhere on the image to reposition it (still writes
  // through the same x/y fields the Position & Size number inputs use, so
  // both stay in sync). Clamped so it can't be dragged fully off-canvas.
  const startDrag = (e: React.PointerEvent) => {
    if (!isEditable) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect?.(element.id);
    const canvas = canvasRef?.current;
    if (!canvas || !onMove) return;
    const rect = canvas.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startElX = element.x;
    const startElY = element.y;

    const handleMove = (ev: PointerEvent) => {
      const dxPct = ((ev.clientX - startX) / rect.width) * 100;
      const dyPct = ((ev.clientY - startY) / rect.height) * 100;
      const newX = Math.min(100 - element.width, Math.max(0, startElX + dxPct));
      const newY = Math.min(100 - element.height, Math.max(0, startElY + dyPct));
      onMove(element.id, newX, newY);
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  // Drag any handle to scale the whole image down/up from its centre,
  // locked to the photo's own natural aspect ratio - this shrinks the
  // photo as a whole rather than cropping it (objectFit stays "cover", but
  // since the box always matches the photo's real proportions there's
  // nothing left over for "cover" to crop away).
  const MIN_SIZE_PCT = 4;
  const startResize = (edge: "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw") => (e: React.PointerEvent) => {
    if (!isEditable) return;
    e.preventDefault();
    e.stopPropagation();
    const canvas = canvasRef?.current;
    if (!canvas || !onResize) return;
    const rect = canvas.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startElX = element.x;
    const startElY = element.y;
    const startElW = element.width;
    const startElH = element.height;

    const startWpx = (startElW / 100) * rect.width;
    const startHpx = (startElH / 100) * rect.height;
    const naturalAspect =
      imgRef.current?.naturalWidth && imgRef.current?.naturalHeight
        ? imgRef.current.naturalWidth / imgRef.current.naturalHeight
        : startWpx / startHpx;
    const centerXpx = ((startElX + startElW / 2) / 100) * rect.width;
    const centerYpx = ((startElY + startElH / 2) / 100) * rect.height;
    const minWpx = (MIN_SIZE_PCT / 100) * rect.width;
    const minHpx = (MIN_SIZE_PCT / 100) * rect.height;

    const handleMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      let scale = 1;
      if (edge === "e") scale = (startWpx + dx) / startWpx;
      else if (edge === "w") scale = (startWpx - dx) / startWpx;
      else if (edge === "s") scale = (startHpx + dy) / startHpx;
      else if (edge === "n") scale = (startHpx - dy) / startHpx;
      else if (edge === "se") scale = Math.max((startWpx + dx) / startWpx, (startHpx + dy) / startHpx);
      else if (edge === "sw") scale = Math.max((startWpx - dx) / startWpx, (startHpx + dy) / startHpx);
      else if (edge === "ne") scale = Math.max((startWpx + dx) / startWpx, (startHpx - dy) / startHpx);
      else if (edge === "nw") scale = Math.max((startWpx - dx) / startWpx, (startHpx - dy) / startHpx);

      let newWpx = Math.max(minWpx, startWpx * scale);
      let newHpx = newWpx / naturalAspect;
      if (newHpx < minHpx) {
        newHpx = minHpx;
        newWpx = newHpx * naturalAspect;
      }
      // Keep the scaled box within the canvas, still centred on the same point.
      newWpx = Math.min(newWpx, rect.width);
      newHpx = Math.min(newHpx, rect.height);

      const newXpx = Math.min(Math.max(0, centerXpx - newWpx / 2), rect.width - newWpx);
      const newYpx = Math.min(Math.max(0, centerYpx - newHpx / 2), rect.height - newHpx);

      onResize(
        element.id,
        (newXpx / rect.width) * 100,
        (newYpx / rect.height) * 100,
        (newWpx / rect.width) * 100,
        (newHpx / rect.height) * 100,
      );
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const resizeHandleCls =
    "absolute bg-purple-400/80 hover:bg-purple-400 rounded-full transition-opacity z-10";
  // Corners are small squares, not circles - avoids reading as "dots" the
  // way a rounded handle does at a sharp corner.
  const cornerHandleCls =
    "absolute bg-purple-400/80 hover:bg-purple-400 rounded-[2px] transition-opacity z-10 w-2 h-2";

  return (
    <div
      onPointerDown={isEditable ? startDrag : undefined}
      style={{
        position: "absolute",
        left: `${element.x}%`,
        top: `${element.y}%`,
        width: `${element.width}%`,
        height: `${element.height}%`,
        opacity: element.opacity ?? 1,
        zIndex: element.zIndex,
        display: element.visible ? "block" : "none",
        cursor: isEditable ? "move" : undefined,
        outline: isEditable && isSelected ? "1.5px dashed #a855f7" : undefined,
        outlineOffset: isEditable && isSelected ? "1px" : undefined,
        ...animStyle,
      }}>
      {/* Clips only the photo itself - the delete button and resize handles
          below live outside this box, so they're never cropped by it. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          borderRadius: element.borderRadius ? `${element.borderRadius}px` : undefined,
        }}
      >
        {element.src && (
          <img
            ref={imgRef}
            src={element.src}
            alt={element.name || ""}
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: (element.objectFit as React.CSSProperties["objectFit"]) || "cover",
              display: "block",
              pointerEvents: "none",
            }}
          />
        )}
      </div>
      {isEditable && isSelected && (
        <>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(element.id);
            }}
            title="Delete image"
            className="absolute -top-2 -right-2 z-20 flex items-center justify-center w-5 h-5 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg transition-colors"
          >
            <XIcon className="w-3 h-3" />
          </button>
          <div onPointerDown={startResize("n")} className={`${resizeHandleCls} top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-[3px] cursor-ns-resize`} />
          <div onPointerDown={startResize("s")} className={`${resizeHandleCls} bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-8 h-[3px] cursor-ns-resize`} />
          <div onPointerDown={startResize("e")} className={`${resizeHandleCls} right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-[3px] h-8 cursor-ew-resize`} />
          <div onPointerDown={startResize("w")} className={`${resizeHandleCls} left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-[3px] h-8 cursor-ew-resize`} />
          <div onPointerDown={startResize("ne")} className={`${cornerHandleCls} top-0 right-0 -translate-y-1/2 translate-x-1/2 cursor-nesw-resize`} />
          <div onPointerDown={startResize("nw")} className={`${cornerHandleCls} top-0 left-0 -translate-y-1/2 -translate-x-1/2 cursor-nwse-resize`} />
          <div onPointerDown={startResize("se")} className={`${cornerHandleCls} bottom-0 right-0 translate-y-1/2 translate-x-1/2 cursor-nwse-resize`} />
          <div onPointerDown={startResize("sw")} className={`${cornerHandleCls} bottom-0 left-0 translate-y-1/2 -translate-x-1/2 cursor-nesw-resize`} />
        </>
      )}
    </div>
  );
}

// ─── LowerThirdRenderer ───────────────────────────────────────────────────────

interface LowerThirdRendererProps {
  template: LowerThirdTemplate;
  data: LowerThirdBindingData;
  isVisible: boolean;
  containerWidth?: number;
  containerHeight?: number;
  isPreview?: boolean;
  // Editor-only interactivity (LowerThirdEditorPage's "Live Preview" pane) -
  // never set from the real broadcast display or the template gallery
  // thumbnail, both of which stay pointer-events:none via isPreview above.
  isEditable?: boolean;
  selectedElementId?: string | null;
  onSelectElement?: (id: string) => void;
  onMoveElement?: (id: string, x: number, y: number) => void;
  onResizeElement?: (id: string, x: number, y: number, width: number, height: number) => void;
  onDeleteElement?: (id: string) => void;
}

export function LowerThirdRenderer({
  template,
  data,
  isVisible,
  isPreview = false,
  isEditable = false,
  selectedElementId = null,
  onSelectElement,
  onMoveElement,
  onResizeElement,
  onDeleteElement,
}: LowerThirdRendererProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={canvasRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        pointerEvents: isEditable ? "auto" : isPreview ? "none" : undefined,
      }}>
      {template.elements
        .filter((el) => el.visible)
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((element) => {
          if (element.type === "text") {
            return (
              <SmartTextElement
                key={element.id}
                element={element}
                text={resolveText(element, data)}
                isVisible={isVisible}
                isPreview={isPreview}
              />
            );
          }
          if (element.type === "image") {
            return (
              <ImageElement
                key={element.id}
                element={element}
                isVisible={isVisible}
                isPreview={isPreview}
                isEditable={isEditable}
                isSelected={selectedElementId === element.id}
                canvasRef={canvasRef}
                onSelect={onSelectElement}
                onMove={onMoveElement}
                onResize={onResizeElement}
                onDelete={onDeleteElement}
              />
            );
          }
          return (
            <ShapeElement
              key={element.id}
              element={element}
              isVisible={isVisible}
              isPreview={isPreview}
              isEditable={isEditable}
              isSelected={selectedElementId === element.id}
              onSelect={onSelectElement}
            />
          );
        })}
    </div>
  );
}

// ─── Preview Thumbnail ────────────────────────────────────────────────────────

export function LowerThirdPreviewThumbnail({
  template,
  width = 320,
  height = 180,
}: {
  template: LowerThirdTemplate;
  width?: number;
  height?: number;
}) {
  const sampleData: LowerThirdBindingData = {
    verse: "For God so loved the world that he gave his one and only Son",
    reference: "John 3:16",
    version: "NIV",
    churchName: "My Church",
    songTitle: "",
  };

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: "#000",
        borderRadius: "8px",
        overflow: "hidden",
        position: "relative",
      }}>
      <LowerThirdRenderer
        template={template}
        data={sampleData}
        isVisible={true}
        containerWidth={width}
        containerHeight={height}
        isPreview={true}
      />
    </div>
  );
}
