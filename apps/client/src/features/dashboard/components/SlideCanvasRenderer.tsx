import React, { useRef, useEffect, useState } from "react";
import { resolveMediaUrl } from "@/lib/queryClient";

export const SlideCanvasRenderer = ({
  content,
  background,
  scaleMode = "contain",
  showBackdrop = true,
  debugSource = "unknown",
}: {
  content: any;
  background?: any;
  scaleMode?: "contain" | "cover";
  showBackdrop?: boolean;
  debugSource?: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const artboardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const hasLoggedScaleRef = useRef(false);
  const hasLoggedRenderRef = useRef(false);
  const bgProbeLoggedRef = useRef<Record<string, boolean>>({});
  const queueRenderTraceRef = useRef<Record<string, boolean>>({});
  const previewFitTraceRef = useRef<Record<string, boolean>>({});
  const thumbScaleProbeRef = useRef<Record<string, boolean>>({});
  const thumbPipelineProbeRef = useRef<Record<string, boolean>>({});
  const thumbImageProbeRef = useRef<Record<string, boolean>>({});
  const thumbImageLayoutProbeRef = useRef<Record<string, boolean>>({});
  const thumbBackgroundProbeRef = useRef<Record<string, boolean>>({});
  const scaleRetryCountRef = useRef(0);
  const scaleRetryTimeoutRef = useRef<number | null>(null);
  const CANVAS_WIDTH = 960;
  const CANVAS_HEIGHT = 540;
  const isDashboardCardPreview =
    debugSource === "dashboard-main:slidesColumnCard" ||
    debugSource === "dashboard-main:queueListCard" ||
    debugSource === "dashboard-main:secondaryQueueCard";
  // Dashboard queue/column cards should render full-bleed previews.
  const isDashboardThumbnailNoCrop = false;
  const shouldApplyPreviewFit = isDashboardCardPreview;
  const isTemplatePreview =
    debugSource === "editor-template-sidebar" || debugSource === "media-templates-grid";

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

    if ((dx === 0 && dy === 0) && totalOverflow < 80) {
      // Preserve authored arrangement unless we need an overflow correction.
      return rawElements;
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

      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      if (width < 8 || height < 8) {
        if (scaleRetryCountRef.current < 12) {
          scaleRetryCountRef.current += 1;
          if (scaleRetryTimeoutRef.current) {
            window.clearTimeout(scaleRetryTimeoutRef.current);
          }
          scaleRetryTimeoutRef.current = window.setTimeout(
            updateScale,
            30 + scaleRetryCountRef.current * 25,
          );
        }
        return;
      }

      scaleRetryCountRef.current = 0;

      if (width > 0 && height > 0) {
        const widthScale = width / CANVAS_WIDTH;
        const heightScale = height / CANVAS_HEIGHT;
        const measuredScale =
          scaleMode === "cover" ? Math.max(widthScale, heightScale) : Math.min(widthScale, heightScale);
        const minScale = isTemplatePreview ? 0.12 : 0.01;
        const nextScale = Number.isFinite(measuredScale)
          ? Math.max(measuredScale, minScale)
          : 1;
        setScale(nextScale);
        if (isDashboardCardPreview) {
          const scaleProbeKey = `${debugSource}:${Math.round(width)}:${Math.round(height)}:${Math.round(nextScale * 1000)}`;
          if (!thumbScaleProbeRef.current[scaleProbeKey]) {
            thumbScaleProbeRef.current[scaleProbeKey] = true;
            // #region agent log
            fetch('http://127.0.0.1:7568/ingest/109086ba-dec0-4cee-b02e-eb1cf11ca2b9',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3b938c'},body:JSON.stringify({sessionId:'3b938c',runId:'thumb-debug-v6',hypothesisId:'H6_RECHECK',location:'SlideCanvasRenderer.tsx:updateScale',message:'Dashboard thumbnail scale recomputed',data:{debugSource,scaleMode,containerWidth:Math.round(width),containerHeight:Math.round(height),rectWidth:Math.round(rect.width),rectHeight:Math.round(rect.height),widthScale,heightScale,measuredScale,nextScale,minScale,isDashboardThumbnailNoCrop,isDashboardCardPreview},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
          }
        }
        if (!hasLoggedScaleRef.current) {
          hasLoggedScaleRef.current = true;
          // #region agent log
          fetch('http://127.0.0.1:7568/ingest/109086ba-dec0-4cee-b02e-eb1cf11ca2b9',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1fdb7f'},body:JSON.stringify({sessionId:'1fdb7f',runId:'template-preview-baseline',hypothesisId:'H1',location:'SlideCanvasRenderer.tsx:updateScale',message:'Renderer measured container and selected scale',data:{debugSource,scaleMode,showBackdrop,width,height,widthScale,heightScale,nextScale},timestamp:Date.now()})}).catch(()=>{});
          // #endregion
        }
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
    // Re-run after layout settles so hidden->visible transitions are corrected.
    const rafId = window.requestAnimationFrame(updateScale);
    const timeoutId = window.setTimeout(updateScale, 120);
    const lateTimeoutId = window.setTimeout(updateScale, 360);

    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) observer.observe(containerRef.current);
    const parentEl = containerRef.current?.parentElement;
    if (parentEl) observer.observe(parentEl);

    window.addEventListener("resize", updateScale);
    document.addEventListener("visibilitychange", updateScale);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
      window.clearTimeout(lateTimeoutId);
      if (scaleRetryTimeoutRef.current) {
        window.clearTimeout(scaleRetryTimeoutRef.current);
      }
      window.removeEventListener("resize", updateScale);
      document.removeEventListener("visibilitychange", updateScale);
    };
  }, [scaleMode, shouldApplyPreviewFit, isTemplatePreview, debugSource, content]);

  useEffect(() => {
    if (hasLoggedRenderRef.current) return;
    hasLoggedRenderRef.current = true;
    // #region agent log
    fetch('http://127.0.0.1:7568/ingest/109086ba-dec0-4cee-b02e-eb1cf11ca2b9',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1fdb7f'},body:JSON.stringify({sessionId:'1fdb7f',runId:'template-preview-baseline',hypothesisId:'H2',location:'SlideCanvasRenderer.tsx:renderState',message:'Renderer initial state snapshot',data:{debugSource,scaleMode,showBackdrop,elementsCount:Array.isArray(elements)?elements.length:0,backgroundType:canvasBackground?.type,layoutBounds,layoutOverflow},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, [debugSource, scaleMode, showBackdrop]);

  useEffect(() => {
    if (!isDashboardCardPreview) return;
    // #region agent log
    fetch('http://127.0.0.1:7568/ingest/109086ba-dec0-4cee-b02e-eb1cf11ca2b9',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3b938c'},body:JSON.stringify({sessionId:'3b938c',runId:'thumb-debug-v4',hypothesisId:'H8',location:'SlideCanvasRenderer.tsx:rendererVersionMarker',message:'Renderer instrumentation marker active in loaded bundle',data:{debugSource,scaleMode,showBackdrop,markerVersion:'v4-transform-safe-scale'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, [isDashboardCardPreview, debugSource, scaleMode, showBackdrop]);

  const normalizeBackground = (value: any) => {
    if (!value) return { type: "transparent", value: "" };
    if (typeof value === "string") {
      return { type: "color", value };
    }
    if (typeof value === "object" && !Array.isArray(value)) {
      if (value.type === "color" || value.type === "image" || value.type === "transparent") {
        return { type: value.type, value: value.value || "" };
      }
      if (typeof value.value === "string") {
        return { type: "color", value: value.value };
      }
    }
    return { type: "transparent", value: "" };
  };

  let elements = [];
  let canvasBackground = { type: "transparent", value: "" };

  const normalizedContent = extractCanvasPayload(content);

  const normalizeForRender = (rawElements: any[]) =>
    isTemplatePreview
      ? Array.isArray(rawElements)
        ? rawElements
        : []
      : maybeReframeShiftedLayout(maybeNormalizeLegacyElementAnchoring(rawElements || []));

  if (typeof normalizedContent === 'string') {
    try {
      // Basic check to see if it looks like JSON before parsing
      if (normalizedContent.trim().startsWith('{') || normalizedContent.trim().startsWith('[')) {
        const parsed = JSON.parse(normalizedContent);
        elements = normalizeForRender(parsed.elements || []);
        canvasBackground = normalizeBackground(parsed.background || parsed.canvasBackground || canvasBackground);
      } else {
        // If it's a plain string, we could optionally render it as a single text element
        // or just ignore it. Let's create a temporary text element if it's not JSON.
        elements = normalizeForRender([{
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
        }]);
      }
    } catch (e) {
      console.error('Failed to parse canvas content', e);
    }
  } else if (normalizedContent && typeof normalizedContent === 'object') {
    elements = normalizeForRender(normalizedContent.elements || []);
    canvasBackground = normalizeBackground(
      normalizedContent.canvasBackground ||
        normalizedContent.background ||
        // Legacy field compatibility in case some flow still stores this shape.
        (normalizedContent.backgroundImage
          ? { type: "image", value: normalizedContent.backgroundImage }
          : null) ||
        canvasBackground,
    );
  }

  // Only override if the parent explicitly passes a non-transparent background
  if (background && background.type && background.type !== 'transparent') {
    canvasBackground = background;
  }

  const fitContentBoundsForPreview = (rawElements: any[]) => {
    if (isTemplatePreview) {
      return {
        elements: rawElements || [],
        fitApplied: false,
        sourceBounds: null as any,
        transformedBounds: null as any,
        fitScale: 1,
      };
    }

    if (!shouldApplyPreviewFit || !Array.isArray(rawElements) || rawElements.length === 0) {
      return {
        elements: rawElements || [],
        fitApplied: false,
        sourceBounds: null as any,
        transformedBounds: null as any,
        fitScale: 1,
      };
    }

    const numericElements = rawElements.filter(
      (el: any) =>
        el &&
        typeof el.x === "number" &&
        typeof el.y === "number" &&
        typeof el.width === "number" &&
        typeof el.height === "number",
    );
    if (!numericElements.length) {
      return {
        elements: rawElements,
        fitApplied: false,
        sourceBounds: null as any,
        transformedBounds: null as any,
        fitScale: 1,
      };
    }

    const sourceBounds = numericElements.reduce(
      (acc: any, el: any) => ({
        left: Math.min(acc.left, el.x),
        top: Math.min(acc.top, el.y),
        right: Math.max(acc.right, el.x + el.width),
        bottom: Math.max(acc.bottom, el.y + el.height),
      }),
      { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity },
    );

    const sourceWidth = sourceBounds.right - sourceBounds.left;
    const sourceHeight = sourceBounds.bottom - sourceBounds.top;
    if (sourceWidth <= 0 || sourceHeight <= 0) {
      return {
        elements: rawElements,
        fitApplied: false,
        sourceBounds,
        transformedBounds: sourceBounds,
        fitScale: 1,
      };
    }

    const overflowLeft = Math.max(0, -sourceBounds.left);
    const overflowTop = Math.max(0, -sourceBounds.top);
    const overflowRight = Math.max(0, sourceBounds.right - CANVAS_WIDTH);
    const overflowBottom = Math.max(0, sourceBounds.bottom - CANVAS_HEIGHT);
    const hasMeaningfulOverflow =
      overflowLeft + overflowTop + overflowRight + overflowBottom > 12;
    if (!hasMeaningfulOverflow) {
      return {
        elements: rawElements,
        fitApplied: false,
        sourceBounds,
        transformedBounds: sourceBounds,
        fitScale: 1,
      };
    }

    const targetW = CANVAS_WIDTH * 0.96;
    const targetH = CANVAS_HEIGHT * 0.94;
    const fitScaleRaw = Math.min(targetW / sourceWidth, targetH / sourceHeight);
    const fitScale = Math.min(1, fitScaleRaw);
    if (!Number.isFinite(fitScale) || fitScale >= 0.99) {
      return {
        elements: rawElements,
        fitApplied: false,
        sourceBounds,
        transformedBounds: sourceBounds,
        fitScale: 1,
      };
    }

    const offsetX = (CANVAS_WIDTH - sourceWidth * fitScale) / 2;
    const offsetY = (CANVAS_HEIGHT - sourceHeight * fitScale) / 2;
    const transformedElements = rawElements.map((el: any) => {
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
        x: (el.x - sourceBounds.left) * fitScale + offsetX,
        y: (el.y - sourceBounds.top) * fitScale + offsetY,
        width: el.width * fitScale,
        height: el.height * fitScale,
        fontSize:
          typeof el.fontSize === "number" ? Math.max(12, el.fontSize * fitScale) : el.fontSize,
        letterSpacing:
          typeof el.letterSpacing === "number" ? el.letterSpacing * fitScale : el.letterSpacing,
      };
    });

    const transformedNumeric = transformedElements.filter(
      (el: any) =>
        el &&
        typeof el.x === "number" &&
        typeof el.y === "number" &&
        typeof el.width === "number" &&
        typeof el.height === "number",
    );
    const transformedBounds =
      transformedNumeric.length > 0
        ? transformedNumeric.reduce(
            (acc: any, el: any) => ({
              left: Math.min(acc.left, el.x),
              top: Math.min(acc.top, el.y),
              right: Math.max(acc.right, el.x + el.width),
              bottom: Math.max(acc.bottom, el.y + el.height),
            }),
            { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity },
          )
        : null;

    return {
      elements: transformedElements,
      fitApplied: true,
      sourceBounds,
      transformedBounds,
      fitScale,
    };
  };

  const previewFitResult = fitContentBoundsForPreview(elements);
  const applyContainmentFallback = (rawElements: any[]) => {
    if (!isDashboardCardPreview || !Array.isArray(rawElements) || rawElements.length === 0) {
      return {
        elements: rawElements || [],
        fallbackApplied: false,
      };
    }

    const numericElements = rawElements.filter(
      (el: any) =>
        el &&
        typeof el.x === "number" &&
        typeof el.y === "number" &&
        typeof el.width === "number" &&
        typeof el.height === "number",
    );
    if (!numericElements.length) {
      return {
        elements: rawElements,
        fallbackApplied: false,
      };
    }

    const bounds = numericElements.reduce(
      (acc: any, el: any) => ({
        left: Math.min(acc.left, el.x),
        top: Math.min(acc.top, el.y),
        right: Math.max(acc.right, el.x + el.width),
        bottom: Math.max(acc.bottom, el.y + el.height),
      }),
      { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity },
    );

    const overflowLeft = Math.max(0, -bounds.left);
    const overflowTop = Math.max(0, -bounds.top);
    const overflowRight = Math.max(0, bounds.right - CANVAS_WIDTH);
    const overflowBottom = Math.max(0, bounds.bottom - CANVAS_HEIGHT);
    const totalOverflow = overflowLeft + overflowTop + overflowRight + overflowBottom;
    if (totalOverflow <= 0) {
      return {
        elements: rawElements,
        fallbackApplied: false,
      };
    }

    const sourceWidth = bounds.right - bounds.left;
    const sourceHeight = bounds.bottom - bounds.top;
    if (sourceWidth <= 0 || sourceHeight <= 0) {
      return {
        elements: rawElements,
        fallbackApplied: false,
      };
    }

    const fitScale = Math.min(1, CANVAS_WIDTH / sourceWidth, CANVAS_HEIGHT / sourceHeight);
    if (!Number.isFinite(fitScale) || fitScale <= 0) {
      return {
        elements: rawElements,
        fallbackApplied: false,
      };
    }

    const offsetX = (CANVAS_WIDTH - sourceWidth * fitScale) / 2;
    const offsetY = (CANVAS_HEIGHT - sourceHeight * fitScale) / 2;
    const transformed = rawElements.map((el: any) => {
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
        x: (el.x - bounds.left) * fitScale + offsetX,
        y: (el.y - bounds.top) * fitScale + offsetY,
        width: el.width * fitScale,
        height: el.height * fitScale,
        fontSize:
          typeof el.fontSize === "number" ? Math.max(10, el.fontSize * fitScale) : el.fontSize,
        letterSpacing:
          typeof el.letterSpacing === "number" ? el.letterSpacing * fitScale : el.letterSpacing,
      };
    });

    return {
      elements: transformed,
      fallbackApplied: true,
    };
  };

  const containmentResult = applyContainmentFallback(previewFitResult.elements);
  let renderedElements = containmentResult.elements;

  // Some legacy canvas slides save a full-frame rectangle instead of canvasBackground.
  // For dashboard thumbnails, promote it to real background so the whole artboard is filled.
  if (
    isDashboardCardPreview &&
    Array.isArray(renderedElements) &&
    (!canvasBackground?.type || canvasBackground.type === "transparent")
  ) {
    const fullFrameRect = renderedElements.find((el: any) => {
      if (!el || el.type !== "rect") return false;
      const x = typeof el.x === "number" ? el.x : 0;
      const y = typeof el.y === "number" ? el.y : 0;
      const w = typeof el.width === "number" ? el.width : 0;
      const h = typeof el.height === "number" ? el.height : 0;
      const coversCanvas =
        x <= 2 &&
        y <= 2 &&
        x + w >= CANVAS_WIDTH - 2 &&
        y + h >= CANVAS_HEIGHT - 2;
      return coversCanvas && typeof el.color === "string" && !!el.color;
    });

    if (fullFrameRect) {
      canvasBackground = { type: "color", value: fullFrameRect.color };
      renderedElements = renderedElements.filter((el: any) => el.id !== fullFrameRect.id);
    } else {
      // Legacy fallback: some saved slides use a large anchored rect as a visual background block.
      // Promote its color to artboard background for thumbnail fidelity, but keep the element.
      const anchoredRect = renderedElements
        .filter((el: any) => el && el.type === "rect" && typeof el.color === "string")
        .map((el: any) => {
          const x = typeof el.x === "number" ? el.x : 0;
          const y = typeof el.y === "number" ? el.y : 0;
          const w = typeof el.width === "number" ? el.width : 0;
          const h = typeof el.height === "number" ? el.height : 0;
          return { el, x, y, w, h, area: w * h };
        })
        .filter(
          (entry: any) =>
            entry.x <= 4 &&
            entry.y <= 4 &&
            (entry.h >= CANVAS_HEIGHT - 4 && entry.w >= CANVAS_WIDTH * 0.45),
        )
        .sort((a: any, b: any) => b.area - a.area)[0];

      if (anchoredRect) {
        canvasBackground = { type: "color", value: anchoredRect.el.color };
      }
    }
  }

  // resolve image URLs for background
  let bgUrl = canvasBackground?.value;
  if (canvasBackground?.type === 'image' && bgUrl) {
    bgUrl = resolveMediaUrl(bgUrl) || bgUrl;
  }

  useEffect(() => {
    if (!bgUrl || canvasBackground?.type !== "image") return;
    const probeKey = `${debugSource}:${bgUrl}`;
    if (bgProbeLoggedRef.current[probeKey]) return;
    bgProbeLoggedRef.current[probeKey] = true;

    const img = new Image();
    img.onload = () => {
      // #region agent log
      fetch('http://127.0.0.1:7568/ingest/109086ba-dec0-4cee-b02e-eb1cf11ca2b9',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1fdb7f'},body:JSON.stringify({sessionId:'1fdb7f',runId:'template-bg-probe',hypothesisId:'H11',location:'SlideCanvasRenderer.tsx:bgProbe',message:'Background image loaded',data:{debugSource,bgUrl},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    };
    img.onerror = () => {
      // #region agent log
      fetch('http://127.0.0.1:7568/ingest/109086ba-dec0-4cee-b02e-eb1cf11ca2b9',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1fdb7f'},body:JSON.stringify({sessionId:'1fdb7f',runId:'template-bg-probe',hypothesisId:'H11',location:'SlideCanvasRenderer.tsx:bgProbe',message:'Background image failed to load',data:{debugSource,bgUrl},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    };
    img.src = bgUrl;
  }, [bgUrl, canvasBackground?.type, debugSource]);

  const numericElementsForBounds = Array.isArray(renderedElements)
    ? renderedElements.filter(
        (el: any) =>
          el &&
          typeof el.x === "number" &&
          typeof el.y === "number" &&
          typeof el.width === "number" &&
          typeof el.height === "number",
      )
    : [];
  const layoutBounds =
    numericElementsForBounds.length > 0
      ? numericElementsForBounds.reduce(
          (acc: any, el: any) => ({
            left: Math.min(acc.left, el.x),
            top: Math.min(acc.top, el.y),
            right: Math.max(acc.right, el.x + el.width),
            bottom: Math.max(acc.bottom, el.y + el.height),
          }),
          { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity },
        )
      : null;
  const layoutOverflow =
    layoutBounds
      ? {
          left: Math.max(0, -layoutBounds.left),
          top: Math.max(0, -layoutBounds.top),
          right: Math.max(0, layoutBounds.right - CANVAS_WIDTH),
          bottom: Math.max(0, layoutBounds.bottom - CANVAS_HEIGHT),
        }
      : null;

  useEffect(() => {
    if (!isDashboardCardPreview) return;
    const probeKey = `${debugSource}:${canvasBackground?.type || "none"}:${previewFitResult.fitApplied ? "fit" : "raw"}:${containmentResult.fallbackApplied ? "fallback" : "nofallback"}:${Array.isArray(elements) ? elements.length : 0}:${Array.isArray(renderedElements) ? renderedElements.length : 0}`;
    if (thumbPipelineProbeRef.current[probeKey]) return;
    thumbPipelineProbeRef.current[probeKey] = true;
    // #region agent log
    fetch('http://127.0.0.1:7568/ingest/109086ba-dec0-4cee-b02e-eb1cf11ca2b9',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3b938c'},body:JSON.stringify({sessionId:'3b938c',runId:'thumb-debug-v1',hypothesisId:'H1-H3-H4',location:'SlideCanvasRenderer.tsx:thumbnailPipeline',message:'Dashboard thumbnail render pipeline snapshot',data:{debugSource,isDashboardCardPreview,isDashboardThumbnailNoCrop,scaleMode,shouldApplyPreviewFit,canvasBackgroundType:canvasBackground?.type||null,canvasBackgroundValue:canvasBackground?.value||null,elementsCount:Array.isArray(elements)?elements.length:0,renderedElementsCount:Array.isArray(renderedElements)?renderedElements.length:0,layoutBounds,layoutOverflow,fitApplied:previewFitResult.fitApplied,fitScale:previewFitResult.fitScale,sourceBounds:previewFitResult.sourceBounds,transformedBounds:previewFitResult.transformedBounds,fallbackApplied:containmentResult.fallbackApplied},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, [isDashboardCardPreview, debugSource, isDashboardThumbnailNoCrop, scaleMode, shouldApplyPreviewFit, canvasBackground?.type, canvasBackground?.value, elements, renderedElements, layoutBounds, layoutOverflow, previewFitResult.fitApplied, previewFitResult.fitScale, previewFitResult.sourceBounds, previewFitResult.transformedBounds, containmentResult.fallbackApplied]);

  useEffect(() => {
    if (!isDashboardCardPreview) return;
    const imageElements = Array.isArray(renderedElements)
      ? renderedElements.filter((el: any) => el && el.type === "image")
      : [];
    const probeKey = `${debugSource}:img:${imageElements.length}:${isDashboardThumbnailNoCrop ? "contain" : "cover"}`;
    if (thumbImageProbeRef.current[probeKey]) return;
    thumbImageProbeRef.current[probeKey] = true;
    // #region agent log
    fetch('http://127.0.0.1:7568/ingest/109086ba-dec0-4cee-b02e-eb1cf11ca2b9',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3b938c'},body:JSON.stringify({sessionId:'3b938c',runId:'thumb-debug-v1',hypothesisId:'H5',location:'SlideCanvasRenderer.tsx:imageElementFit',message:'Dashboard thumbnail image fit mode',data:{debugSource,imageElementsCount:imageElements.length,imageFitMode:isDashboardThumbnailNoCrop?'object-contain':'object-cover',backgroundFitMode:isDashboardThumbnailNoCrop?'contain':'cover'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, [isDashboardCardPreview, renderedElements, debugSource, isDashboardThumbnailNoCrop]);

  useEffect(() => {
    const isQueuePreview =
      debugSource === "dashboard-main:queueListCard" ||
      debugSource === "dashboard-main:slidesColumnCard" ||
      debugSource === "dashboard-main:secondaryQueueCard";
    if (!isQueuePreview) return;

    const boundsKey = layoutBounds
      ? `${Math.round(layoutBounds.left)}:${Math.round(layoutBounds.top)}:${Math.round(layoutBounds.right)}:${Math.round(layoutBounds.bottom)}`
      : "no-bounds";
    const traceKey = `${debugSource}:${canvasBackground?.type || "none"}:${bgUrl || "no-bg"}:${boundsKey}:${scaleMode}:${showBackdrop}:${previewFitResult.fitApplied ? "fit" : "raw"}`;
    if (queueRenderTraceRef.current[traceKey]) return;
    queueRenderTraceRef.current[traceKey] = true;

    // #region agent log
    fetch('http://127.0.0.1:7568/ingest/109086ba-dec0-4cee-b02e-eb1cf11ca2b9',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1fdb7f'},body:JSON.stringify({sessionId:'1fdb7f',runId:'queue-render-trace',hypothesisId:'H14',location:'SlideCanvasRenderer.tsx:queueRenderTrace',message:'Queue preview resolved render state',data:{debugSource,scaleMode,showBackdrop,elementsCount:Array.isArray(renderedElements)?renderedElements.length:0,layoutBounds,layoutOverflow,canvasBackgroundType:canvasBackground?.type||null,bgUrl:bgUrl||null,fitApplied:previewFitResult.fitApplied,fitScale:previewFitResult.fitScale,sourceBounds:previewFitResult.sourceBounds,transformedBounds:previewFitResult.transformedBounds},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, [debugSource, scaleMode, showBackdrop, renderedElements, layoutBounds, layoutOverflow, canvasBackground?.type, bgUrl, previewFitResult.fitApplied, previewFitResult.fitScale, previewFitResult.sourceBounds, previewFitResult.transformedBounds]);

  useEffect(() => {
    const traceKey = `${debugSource}:${previewFitResult.fitApplied ? "fit" : "raw"}:${Math.round(previewFitResult.fitScale * 1000)}`;
    if (previewFitTraceRef.current[traceKey]) return;
    previewFitTraceRef.current[traceKey] = true;
    // #region agent log
    fetch('http://127.0.0.1:7568/ingest/109086ba-dec0-4cee-b02e-eb1cf11ca2b9',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1fdb7f'},body:JSON.stringify({sessionId:'1fdb7f',runId:'preview-fit-trace',hypothesisId:'H23',location:'SlideCanvasRenderer.tsx:previewFit',message:'Preview fit transform decision',data:{debugSource,fitApplied:previewFitResult.fitApplied,fitScale:previewFitResult.fitScale,sourceBounds:previewFitResult.sourceBounds,transformedBounds:previewFitResult.transformedBounds},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, [debugSource, previewFitResult.fitApplied, previewFitResult.fitScale, previewFitResult.sourceBounds, previewFitResult.transformedBounds]);

  useEffect(() => {
    if (!isDashboardCardPreview) return;
    const containerRect = containerRef.current?.getBoundingClientRect();
    const artboardRect = artboardRef.current?.getBoundingClientRect();
    if (!containerRect || !artboardRect) return;
    const key = `${debugSource}:${Math.round(containerRect.width)}:${Math.round(containerRect.height)}:${Math.round(artboardRect.width)}:${Math.round(artboardRect.height)}:${Math.round(scale * 1000)}`;
    if (thumbPipelineProbeRef.current[`geom:${key}`]) return;
    thumbPipelineProbeRef.current[`geom:${key}`] = true;
    // #region agent log
    const artboardStyle = artboardRef.current ? window.getComputedStyle(artboardRef.current) : null;
    fetch('http://127.0.0.1:7568/ingest/109086ba-dec0-4cee-b02e-eb1cf11ca2b9',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3b938c'},body:JSON.stringify({sessionId:'3b938c',runId:'thumb-debug-v8',hypothesisId:'H11-H12',location:'SlideCanvasRenderer.tsx:geometryProbeDetailed',message:'Dashboard thumbnail geometry+style snapshot',data:{debugSource,scale,container:{width:Math.round(containerRect.width),height:Math.round(containerRect.height)},artboard:{width:Math.round(artboardRect.width),height:Math.round(artboardRect.height),left:Math.round(artboardRect.left),top:Math.round(artboardRect.top),offsetWidth:artboardRef.current?.offsetWidth||null,offsetHeight:artboardRef.current?.offsetHeight||null,clientWidth:artboardRef.current?.clientWidth||null,clientHeight:artboardRef.current?.clientHeight||null,inlineWidth:artboardRef.current?.style?.width||null,inlineHeight:artboardRef.current?.style?.height||null,inlineTransform:artboardRef.current?.style?.transform||null,computedTransform:artboardStyle?.transform||null,computedWidth:artboardStyle?.width||null,computedHeight:artboardStyle?.height||null,computedMaxWidth:artboardStyle?.maxWidth||null,computedMinWidth:artboardStyle?.minWidth||null,computedBoxSizing:artboardStyle?.boxSizing||null},backgroundType:canvasBackground?.type||null,backgroundValue:canvasBackground?.value||null,layoutBounds,layoutOverflow,devicePixelRatio:typeof window!=='undefined'?window.devicePixelRatio:null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, [isDashboardCardPreview, debugSource, scale, canvasBackground?.type, canvasBackground?.value, layoutBounds, layoutOverflow]);

  useEffect(() => {
    if (!isDashboardCardPreview) return;
    if (canvasBackground?.type !== "image") return;
    const key = `${debugSource}:${canvasBackground?.value || "no-bg"}:${scaleMode}:${showBackdrop}:${isDashboardThumbnailNoCrop}`;
    if (thumbBackgroundProbeRef.current[key]) return;
    thumbBackgroundProbeRef.current[key] = true;
    // #region agent log
    fetch('http://127.0.0.1:7568/ingest/109086ba-dec0-4cee-b02e-eb1cf11ca2b9',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3b938c'},body:JSON.stringify({sessionId:'3b938c',runId:'thumb-debug-v10',hypothesisId:'H15-H16',location:'SlideCanvasRenderer.tsx:backgroundImageMode',message:'Dashboard thumbnail background image mode',data:{debugSource,backgroundType:canvasBackground?.type||null,backgroundValue:canvasBackground?.value||null,scaleMode,showBackdrop,isDashboardThumbnailNoCrop,computedBackgroundSize:isDashboardThumbnailNoCrop?'contain':'cover'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, [isDashboardCardPreview, debugSource, canvasBackground?.type, canvasBackground?.value, scaleMode, showBackdrop, isDashboardThumbnailNoCrop]);

  useEffect(() => {
    if (!isDashboardCardPreview || !containerRef.current) return;
    const parentChain: Array<{
      depth: number;
      tag: string;
      className: string;
      transform: string;
      zoom: string;
      clientWidth: number;
      clientHeight: number;
      rectWidth: number;
      rectHeight: number;
    }> = [];
    let node: HTMLElement | null = containerRef.current;
    for (let i = 0; i < 20 && node; i++) {
      const style = window.getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      parentChain.push({
        depth: i,
        tag: node.tagName.toLowerCase(),
        className: node.className || "",
        transform: style.transform || "none",
        zoom: (style as any).zoom || "normal",
        clientWidth: node.clientWidth,
        clientHeight: node.clientHeight,
        rectWidth: Math.round(rect.width),
        rectHeight: Math.round(rect.height),
      });
      node = node.parentElement;
    }
    // #region agent log
    fetch('http://127.0.0.1:7568/ingest/109086ba-dec0-4cee-b02e-eb1cf11ca2b9',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3b938c'},body:JSON.stringify({sessionId:'3b938c',runId:'thumb-debug-v7',hypothesisId:'H9-H10',location:'SlideCanvasRenderer.tsx:parentTransformProbeDeep',message:'Dashboard thumbnail deep ancestor style chain',data:{debugSource,parentChain},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, [isDashboardCardPreview, debugSource]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative overflow-hidden flex items-center justify-center ${showBackdrop ? "bg-black" : ""}`}
    >
      <div
        ref={artboardRef}
        className={`transform-origin-center absolute shrink-0 pointer-events-none ${showBackdrop ? "bg-black" : ""}`}
        style={{
          width: `${CANVAS_WIDTH}px`,
          height: `${CANVAS_HEIGHT}px`,
          maxWidth: 'none',
          maxHeight: 'none',
          minWidth: `${CANVAS_WIDTH}px`,
          minHeight: `${CANVAS_HEIGHT}px`,
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${scale})`,
          backgroundColor:
            canvasBackground.type === 'color'
              ? canvasBackground.value
              : canvasBackground.type === 'transparent'
                ? (showBackdrop ? '#000000' : 'transparent')
                : 'transparent',
          backgroundImage: canvasBackground.type === 'image' ? `url("${bgUrl}")` : 'none',
          backgroundSize: isDashboardThumbnailNoCrop ? 'contain' : 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          transformOrigin: 'center center'
        }}
      >
         {renderedElements.map((el: any) => {
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
                    <img
                      src={contentSrc}
                      alt={el.layerName}
                      className={`w-full h-full ${isDashboardThumbnailNoCrop ? "object-contain" : "object-cover"} select-none pointer-events-none`}
                      ref={(imgEl) => {
                        if (!isDashboardCardPreview || !imgEl) return;
                        const key = `${debugSource}:${el.id}:${contentSrc || "no-src"}:${imgEl.complete ? "complete" : "pending"}`;
                        if (thumbImageLayoutProbeRef.current[key]) return;
                        const imageRect = imgEl.getBoundingClientRect();
                        const parentRect = imgEl.parentElement?.getBoundingClientRect();
                        thumbImageLayoutProbeRef.current[key] = true;
                        // #region agent log
                        fetch('http://127.0.0.1:7568/ingest/109086ba-dec0-4cee-b02e-eb1cf11ca2b9',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3b938c'},body:JSON.stringify({sessionId:'3b938c',runId:'thumb-debug-v9',hypothesisId:'H13-H14',location:'SlideCanvasRenderer.tsx:imageLayoutProbe',message:'Dashboard thumbnail image layout snapshot',data:{debugSource,elementId:el.id,src:contentSrc||null,imgComplete:imgEl.complete,naturalWidth:imgEl.naturalWidth||0,naturalHeight:imgEl.naturalHeight||0,imageRect:{width:Math.round(imageRect.width),height:Math.round(imageRect.height)},parentRect:parentRect?{width:Math.round(parentRect.width),height:Math.round(parentRect.height)}:null,fitMode:isDashboardThumbnailNoCrop?'object-contain':'object-cover'},timestamp:Date.now()})}).catch(()=>{});
                        // #endregion
                      }}
                    />
                 )}
              </div>
            )
         })}
      </div>
    </div>
  );
};
