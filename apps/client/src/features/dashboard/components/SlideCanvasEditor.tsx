import React, { useMemo, useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MediaBrowserContent } from "./MediaBrowserContent";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  LayoutTemplate,
  Type,
  Square,
  Image as ImageIcon,
  Monitor,
  Layers,
  QrCode,
  MousePointer2,
  Trash2,
  Copy,
  Download,
  Play,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  X,
  Plus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Search,
  Type as FontIcon,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyEnd
} from "lucide-react";
import { resolveMediaUrl } from "@/lib/queryClient";
import {
  cloneTemplateForCanvas,
  getAllSlideCanvasTemplates,
  saveCurrentCanvasTemplateToAssets,
  type SlideCanvasTemplate,
} from "./slideCanvasTemplateLibrary";

export interface CanvasElement {
  id: string;
  type: "text" | "rect" | "image";
  layerName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  hidden: boolean;
  // Text
  content?: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: "left" | "center" | "right" | "justify";
  alignVertical?: "top" | "middle" | "bottom";
  textSizing?: "Dynamic" | "Box" | "Fixed";
  textWrap?: "Single-line" | "Multi-line";
  // Effects
  dropShadow?: boolean;
  stroke?: boolean;
  warp?: boolean;
  textOnCircle?: boolean;
  backgroundShape?: boolean;
  shapeType?: "square" | "circle" | "triangle" | "star" | "line";
}

export interface CanvasBackground {
  type: "color" | "image" | "transparent";
  value: string;
}

interface SlideCanvasEditorProps {
  editingContent: any;
  updateItemContent: (id: string, title?: string, content?: any, slides?: any[]) => void;
  setEditingContent: (content: any) => void;
  onClose?: () => void;
}

export const SlideCanvasEditor: React.FC<SlideCanvasEditorProps> = ({
  editingContent,
  updateItemContent,
  setEditingContent,
  onClose
}) => {
  const CANVAS_WIDTH = 960;
  const CANVAS_HEIGHT = 540;
  const normalizeLegacyElementAnchoring = (rawElements: CanvasElement[]): CanvasElement[] => {
    if (!Array.isArray(rawElements) || rawElements.length === 0) return rawElements || [];

    const numericElements = rawElements.filter(
      (el) =>
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
    const shouldConvertFromCenter = topLeftScore > 120 && centeredScore < topLeftScore * 0.65;

    if (!shouldConvertFromCenter) return rawElements;

    return rawElements.map((el) => ({
      ...el,
      x: typeof el.x === "number" && typeof el.width === "number" ? el.x - el.width / 2 : el.x,
      y: typeof el.y === "number" && typeof el.height === "number" ? el.y - el.height / 2 : el.y,
    }));
  };

  const reframeShiftedLayout = (rawElements: CanvasElement[]): CanvasElement[] => {
    if (!Array.isArray(rawElements) || rawElements.length === 0) return rawElements || [];

    const positioned = rawElements.filter(
      (el) =>
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
      // Keep explicit author placement: do not auto-center layouts unless overflowing.
      return rawElements;
    }

    if (dx === 0 && dy === 0) return rawElements;

    return rawElements.map((el) => ({
      ...el,
      x: typeof el.x === "number" ? el.x + dx : el.x,
      y: typeof el.y === "number" ? el.y + dy : el.y,
    }));
  };

  const normalizeCanvasElements = (rawElements: CanvasElement[]): CanvasElement[] =>
    reframeShiftedLayout(normalizeLegacyElementAnchoring(rawElements));

  const parseCanvasPayload = (value: any): any => {
    if (!value) return null;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
      try {
        return JSON.parse(trimmed);
      } catch {
        return null;
      }
    }
    if (typeof value === "object" && !Array.isArray(value)) return value;
    return null;
  };

  const getActiveCanvasSlideId = () =>
    editingContent?.activeCanvasSlideId || editingContent?.slides?.[0]?.id || null;

  const getActiveCanvasContent = () => {
    const activeId = getActiveCanvasSlideId();
    if (activeId && Array.isArray(editingContent?.slides)) {
      const activeSlide = editingContent.slides.find((s: any) => s.id === activeId);
      const parsedActive = parseCanvasPayload(activeSlide?.content);
      if (parsedActive) return parsedActive;
    }

    const parsedItemContent = parseCanvasPayload(editingContent?.content);
    if (parsedItemContent) return parsedItemContent;
    return {};
  };

  const activeCanvasContent = getActiveCanvasContent();

  const [activeTool, setActiveTool] = useState<string>("Text");
  const [elements, setElements] = useState<CanvasElement[]>(
    normalizeCanvasElements(activeCanvasContent?.elements || []),
  );
  const [canvasBackground, setCanvasBackground] = useState<CanvasBackground>(
    activeCanvasContent?.canvasBackground || { type: "transparent", value: "" }
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [templateQuery, setTemplateQuery] = useState("");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [templateFeedback, setTemplateFeedback] = useState<string>("");
  const [templateLibrary, setTemplateLibrary] = useState<SlideCanvasTemplate[]>(
    () => getAllSlideCanvasTemplates(),
  );
  const previousCanvasContextRef = useRef<string | null>(null);
  const pointerInteractionRef = useRef({
    startedOnElement: false,
    didDrag: false,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const activeContent = getActiveCanvasContent();
    const normalizedElements = normalizeCanvasElements(activeContent?.elements || []);
    setElements(normalizedElements);
    setCanvasBackground(
      activeContent?.canvasBackground || { type: "transparent", value: "" },
    );
    const contextKey = `${editingContent?.id || ""}:${getActiveCanvasSlideId() || ""}`;
    const didSwitchCanvasContext = previousCanvasContextRef.current !== contextKey;
    previousCanvasContextRef.current = contextKey;
    if (didSwitchCanvasContext) {
      setSelectedId(null);
      return;
    }
    setSelectedId((prev) =>
      prev && normalizedElements.some((element) => element.id === prev) ? prev : null,
    );
  }, [editingContent?.id, editingContent?.content, editingContent?.activeCanvasSlideId]);

  useEffect(() => {
    const clampScale = (value: number) => {
      if (!Number.isFinite(value)) return 1;
      return Math.min(Math.max(value, 0.05), 6);
    };

    const computeBoundedScale = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      const availableWidth = Math.max(width, 1);
      const availableHeight = Math.max(height, 1);
      const widthScale = availableWidth / CANVAS_WIDTH;
      const heightScale = availableHeight / CANVAS_HEIGHT;
      let nextScale = clampScale(Math.min(widthScale, heightScale));

      // Hard overflow guard: if any axis still exceeds bounds, recompute to strict contain.
      const scaledWidth = CANVAS_WIDTH * nextScale;
      const scaledHeight = CANVAS_HEIGHT * nextScale;
      if (scaledWidth > availableWidth || scaledHeight > availableHeight) {
        nextScale = clampScale(
          Math.min(availableWidth / CANVAS_WIDTH, availableHeight / CANVAS_HEIGHT),
        );
      }

      setScale(nextScale);
    };

    const handleResize = () => {
      computeBoundedScale();
    };

    handleResize();
    // Post-layout stabilization passes for 100% zoom and panel toggle reflows.
    const rafId = window.requestAnimationFrame(computeBoundedScale);
    const settleTimeoutId = window.setTimeout(computeBoundedScale, 120);

    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(settleTimeoutId);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key && !event.key.includes("qworship-slide-canvas-custom-templates")) return;
      setTemplateLibrary(getAllSlideCanvasTemplates());
    };
    const handleTemplateUpdated = () => {
      setTemplateLibrary(getAllSlideCanvasTemplates());
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("qworship-slide-template-updated", handleTemplateUpdated);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("qworship-slide-template-updated", handleTemplateUpdated);
    };
  }, []);

  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);

  const syncState = (newElements: CanvasElement[], newBg: CanvasBackground) => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      const currentContent = getActiveCanvasContent();
      const newContent = { ...currentContent, elements: newElements, canvasBackground: newBg };
      const activeSlideId = getActiveCanvasSlideId();
      const newSlides =
        editingContent.slides?.map((s: any) =>
          activeSlideId
            ? s.id === activeSlideId
              ? { ...s, content: newContent }
              : s
            : { ...s, content: newContent },
        ) || [];
      updateItemContent(editingContent.id, editingContent.title, newContent, newSlides);
    }, 400);
  };

  const updateElement = (id: string, partial: Partial<CanvasElement>, sync = true) => {
    const newElements = elements.map(el => el.id === id ? { ...el, ...partial } : el);
    setElements(newElements);
    if (sync) syncState(newElements, canvasBackground);
  };

  const moveLayer = (id: string, dir: "up" | "down") => {
    const idx = elements.findIndex(e => e.id === id);
    if (idx < 0) return;
    const newEls = [...elements];
    if (dir === "up" && idx > 0) {
      const temp = newEls[idx];
      newEls[idx] = newEls[idx - 1];
      newEls[idx - 1] = temp;
    } else if (dir === "down" && idx < elements.length - 1) {
      const temp = newEls[idx];
      newEls[idx] = newEls[idx + 1];
      newEls[idx + 1] = temp;
    }
    setElements(newEls);
    syncState(newEls, canvasBackground);
  };

  const refreshTemplateLibrary = () => {
    setTemplateLibrary(getAllSlideCanvasTemplates());
  };

  const applyTemplate = (
    template: SlideCanvasTemplate,
    options?: { enterEditMode?: boolean },
  ) => {
    const cloned = cloneTemplateForCanvas(template);
    const normalizedElements = normalizeCanvasElements(cloned.elements as CanvasElement[]);
    setElements(normalizedElements);
    setCanvasBackground(cloned.canvasBackground as CanvasBackground);
    setSelectedId(options?.enterEditMode ? normalizedElements[0]?.id || null : null);
    if (options?.enterEditMode) {
      setActiveTool("");
    }
    syncState(normalizedElements, cloned.canvasBackground as CanvasBackground);
    setTemplateFeedback(
      options?.enterEditMode
        ? `Loaded "${template.name}" for editing.`
        : `Applied "${template.name}"`,
    );
    setTimeout(() => setTemplateFeedback(""), 2200);
  };

  const saveCurrentAsTemplate = () => {
    if (!elements.length) {
      setTemplateFeedback("Add at least one element before saving a template.");
      setTimeout(() => setTemplateFeedback(""), 2200);
      return;
    }

    const templateName = (newTemplateName || editingContent?.title || "Custom Canvas Template").trim();
    saveCurrentCanvasTemplateToAssets({
      name: templateName,
      description: `Saved from ${editingContent?.title || "Slide Canvas"}`,
      category: "Custom",
      elements: elements,
      canvasBackground: canvasBackground,
    });
    setNewTemplateName("");
    refreshTemplateLibrary();
    setTemplateFeedback(`Saved "${templateName}" to Assets > Templates`);
    setTimeout(() => setTemplateFeedback(""), 2600);
  };

  const filteredTemplates = useMemo(() => {
    const query = templateQuery.trim().toLowerCase();
    if (!query) return templateLibrary;
    return templateLibrary.filter(
      (template) =>
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query),
    );
  }, [templateLibrary, templateQuery]);

  const addText = (preset: "headline" | "subhead" | "body") => {
    const isHeadline = preset === "headline";
    const isSubhead = preset === "subhead";
    const newEl: CanvasElement = {
      id: `el-${Date.now()}`,
      type: "text",
      layerName: isHeadline ? "Headline" : isSubhead ? "Subhead" : "Body Text",
      x: 100, y: 100, width: isHeadline ? 400 : 300, height: isHeadline ? 100 : 60,
      rotation: 0, opacity: 100, locked: false, hidden: false,
      content: isHeadline ? "Headline Text" : isSubhead ? "Subheading" : "Body text",
      color: "#ffffff", fontSize: isHeadline ? 72 : isSubhead ? 48 : 24,
      fontFamily: "Inter", fontWeight: isHeadline ? "Bold" : "Normal",
      lineHeight: 1.2, letterSpacing: 0, textAlign: "center", alignVertical: "middle",
      textSizing: "Box", textWrap: "Multi-line", dropShadow: false, stroke: false,
    };
    const newElements = [...elements, newEl];
    setElements(newElements);
    setSelectedId(newEl.id);
    setActiveTool(""); // Automatically show properties panel
    syncState(newElements, canvasBackground);
  };

  const addElement = (shape: "square" | "circle" | "line" | "triangle" | "star") => {
    const newEl: CanvasElement = {
      id: `el-${Date.now()}`,
      type: "rect",
      layerName: shape === "square" ? "Rectangle" : shape === "circle" ? "Circle" : shape === "triangle" ? "Triangle" : shape === "star" ? "Star" : "Line",
      x: 200, y: 200, width: shape === "line" ? 300 : 150, height: shape === "line" ? 4 : 150,
      rotation: 0, opacity: 100, locked: false, hidden: false,
      color: "#8356F3",
      backgroundShape: shape === "circle",
      shapeType: shape
    };
    const newElements = [...elements, newEl];
    setElements(newElements);
    setSelectedId(newEl.id);
    setActiveTool("");
    syncState(newElements, canvasBackground);
  };

  const addImage = (url: string) => {
    const newEl: CanvasElement = {
      id: `el-${Date.now()}`,
      type: "image",
      layerName: "Image",
      x: 150, y: 150, width: 300, height: 200,
      rotation: 0, opacity: 100, locked: false, hidden: false,
      content: url, // image URL
    };
    const newElements = [...elements, newEl];
    setElements(newElements);
    setSelectedId(newEl.id);
    setActiveTool("");
    syncState(newElements, canvasBackground);
  };

  const tools = [
    { id: "Template", icon: LayoutTemplate, label: "Template" },
    { id: "Text", icon: Type, label: "Text" },
    { id: "Elements", icon: Square, label: "Elements" },
    { id: "Images", icon: ImageIcon, label: "Images" },
    { id: "Bkground", icon: Monitor, label: "Bkground" },
    { id: "Layers", icon: Layers, label: "Layers" },
    { id: "QR Codes", icon: QrCode, label: "QR Codes" },
  ];

  const handleDragStart = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    pointerInteractionRef.current.startedOnElement = true;
    pointerInteractionRef.current.didDrag = false;
    setSelectedId(id);
    const element = elements.find(el => el.id === id);
    if (!element || element.locked) {
      pointerInteractionRef.current.startedOnElement = false;
      return;
    }

    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = element.x;
    const initialY = element.y;
    const DRAG_THRESHOLD_PX = 3;

    const handleMouseMove = (mvEvent: MouseEvent) => {
      const moveX = mvEvent.clientX - startX;
      const moveY = mvEvent.clientY - startY;
      if (!pointerInteractionRef.current.didDrag) {
        const distance = Math.sqrt(moveX * moveX + moveY * moveY);
        if (distance >= DRAG_THRESHOLD_PX) {
          pointerInteractionRef.current.didDrag = true;
        } else {
          return;
        }
      }
      const dx = moveX / scale;
      const dy = moveY / scale;
      updateElement(id, { x: initialX + dx, y: initialY + dy }, false);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      pointerInteractionRef.current.startedOnElement = false;
      const dragged = pointerInteractionRef.current.didDrag;
      pointerInteractionRef.current.didDrag = false;
      if (!dragged) return;
      // Sync state after drag completes
      setElements(curr => {
        setTimeout(() => {
          syncState(curr, canvasBackground);
        }, 0);
        return curr;
      });
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleResizeStart = (
    e: React.MouseEvent,
    id: string,
    handle: "nw" | "ne" | "sw" | "se",
  ) => {
    e.preventDefault();
    e.stopPropagation();
    pointerInteractionRef.current.startedOnElement = true;
    pointerInteractionRef.current.didDrag = false;
    setSelectedId(id);
    const element = elements.find((el) => el.id === id);
    if (!element || element.locked) {
      pointerInteractionRef.current.startedOnElement = false;
      return;
    }

    const startX = e.clientX;
    const startY = e.clientY;
    const initial = { ...element };
    const MIN_SIZE = 12;
    const DRAG_THRESHOLD_PX = 3;

    const handleMouseMove = (mvEvent: MouseEvent) => {
      const moveX = mvEvent.clientX - startX;
      const moveY = mvEvent.clientY - startY;
      if (!pointerInteractionRef.current.didDrag) {
        const distance = Math.sqrt(moveX * moveX + moveY * moveY);
        if (distance >= DRAG_THRESHOLD_PX) {
          pointerInteractionRef.current.didDrag = true;
        } else {
          return;
        }
      }
      const dx = moveX / scale;
      const dy = moveY / scale;

      let nextX = initial.x;
      let nextY = initial.y;
      let nextW = initial.width;
      let nextH = initial.height;

      if (handle.includes("w")) {
        nextX = initial.x + dx;
        nextW = initial.width - dx;
      } else {
        nextW = initial.width + dx;
      }

      if (handle.includes("n")) {
        nextY = initial.y + dy;
        nextH = initial.height - dy;
      } else {
        nextH = initial.height + dy;
      }

      if (nextW < MIN_SIZE) {
        if (handle.includes("w")) nextX -= MIN_SIZE - nextW;
        nextW = MIN_SIZE;
      }
      if (nextH < MIN_SIZE) {
        if (handle.includes("n")) nextY -= MIN_SIZE - nextH;
        nextH = MIN_SIZE;
      }

      updateElement(
        id,
        { x: nextX, y: nextY, width: nextW, height: nextH },
        false,
      );
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      pointerInteractionRef.current.startedOnElement = false;
      const dragged = pointerInteractionRef.current.didDrag;
      pointerInteractionRef.current.didDrag = false;
      if (!dragged) return;
      setElements((curr) => {
        setTimeout(() => {
          syncState(curr, canvasBackground);
        }, 0);
        return curr;
      });
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const selectedEl = elements.find(e => e.id === selectedId);
  const nudgeSelectedSize = (axis: "font" | "width" | "height", delta: number) => {
    if (!selectedEl) return;
    if (axis === "font" && selectedEl.type === "text") {
      const next = Math.max(8, (selectedEl.fontSize || 24) + delta);
      updateElement(selectedEl.id, { fontSize: next });
      return;
    }
    if (axis === "width") {
      updateElement(selectedEl.id, { width: Math.max(12, selectedEl.width + delta) });
      return;
    }
    if (axis === "height") {
      updateElement(selectedEl.id, { height: Math.max(12, selectedEl.height + delta) });
    }
  };
  const handleCanvasBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (pointerInteractionRef.current.startedOnElement || pointerInteractionRef.current.didDrag) {
      pointerInteractionRef.current.didDrag = false;
      return;
    }
    setSelectedId(null);
  };

  return (
    <div className="flex w-full h-full bg-[#1e1e2e] rounded-xl overflow-hidden shadow-2xl relative border border-gray-700">

      {/* Primary Toolbar */}
      <div className="w-20 bg-[#282936] border-r border-[#3a3b4c] flex flex-col items-center py-4 z-30 shrink-0 h-full justify-between">
        <div className="flex flex-col space-y-2 w-full px-2">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => {
                setActiveTool(tool.id);
                setSelectedId(null);
              }}
              className={`flex flex-col items-center justify-center w-full py-3 rounded-lg transition-all duration-200 ${activeTool === tool.id || (tool.id === "Text" && selectedEl?.type === "text")
                  ? "bg-[#3a3b4c] text-white"
                  : "text-gray-400 hover:bg-[#323344] hover:text-white"
                }`}
            >
              <tool.icon className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium tracking-wide">{tool.label}</span>
            </button>
          ))}
        </div>

        <div className="pb-4 w-full px-2">
          <button className="flex flex-col items-center justify-center w-full py-3 rounded-lg text-gray-400 hover:bg-[#323344] hover:text-white transition-all">
            <Plus className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium tracking-wide">New Slide</span>
          </button>
        </div>
      </div>

      {/* Secondary Context Panel */}
      {(selectedEl || activeTool) && (
        <div className="w-64 lg:w-72 bg-[#313243] border-r border-[#3a3b4c] flex flex-col shrink-0 z-20 overflow-y-auto custom-scrollbar h-full text-white">

          {/* PROPERTIES PANEL FOR SELECTED ELEMENT */}
          {(selectedEl) ? (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b border-gray-700 tracking-wide font-semibold text-lg">
                {selectedEl.type === 'text' ? 'Text' : selectedEl.type === 'rect' ? 'Element' : 'Image'} Properties
                <button onClick={() => setSelectedId(null)} className="text-gray-400 hover:text-white"><X size={18} /></button>
              </div>
              <div className="p-4 space-y-5">

                {selectedEl.type === "text" && (
                  <>
                    {/* Content */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase text-gray-300 flex items-center gap-1.5"><ChevronDown size={14} /> Content</div>
                      <textarea
                        className="w-full bg-[#1e1e2c] border border-gray-600 rounded-lg p-3 text-sm focus:border-purple-500 outline-none resize-none h-20"
                        value={selectedEl?.content || ""}
                        onChange={(e) => updateElement(selectedEl.id, { content: e.target.value })}
                      />
                    </div>

                {/* Text Formatting */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase text-gray-300 flex items-center gap-1.5"><ChevronDown size={14} /> Text</div>

                  <select
                    className="w-full bg-[#1e1e2c] border border-gray-600 rounded-lg p-2.5 text-sm outline-none"
                    value={selectedEl?.fontFamily || "Inter"}
                    onChange={(e) => selectedEl && updateElement(selectedEl.id, { fontFamily: e.target.value })}
                  >
                    <option value="Cormorant Garamond">Cormorant Garamond</option>
                    <option value="Inter">Inter</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Outfit">Outfit</option>
                  </select>

                  <div className="flex gap-2">
                    <select
                      className="flex-1 bg-[#1e1e2c] border border-gray-600 rounded-lg p-2 text-sm outline-none"
                      value={selectedEl?.fontWeight || "Normal"}
                      onChange={(e) => selectedEl && updateElement(selectedEl.id, { fontWeight: e.target.value })}
                    >
                      <option value="Normal">Normal</option>
                      <option value="Medium">Medium</option>
                      <option value="Bold">Bold</option>
                      <option value="Black">Black</option>
                    </select>

                    <div className="w-28 bg-[#1e1e2c] border border-gray-600 rounded-lg p-1 text-sm flex items-center">
                      <button
                        type="button"
                        className="px-2 py-1 text-gray-300 hover:text-white"
                        onClick={() => nudgeSelectedSize("font", -2)}
                        title="Decrease font size"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={8}
                        className="w-full bg-transparent text-center outline-none"
                        value={selectedEl?.fontSize || 24}
                        onChange={(e) =>
                          selectedEl &&
                          updateElement(selectedEl.id, {
                            fontSize: Math.max(8, Number(e.target.value) || 8),
                          })
                        }
                      />
                      <button
                        type="button"
                        className="px-2 py-1 text-gray-300 hover:text-white"
                        onClick={() => nudgeSelectedSize("font", 2)}
                        title="Increase font size"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 items-center text-gray-400">
                    <div className="flex-1 bg-[#1e1e2c] border border-gray-600 rounded-lg p-2 flex items-center gap-2">
                      <span className="text-xs">|A|</span>
                      <input type="number" className="w-full bg-transparent outline-none text-white text-sm" value={selectedEl?.letterSpacing || 0} onChange={(e) => selectedEl && updateElement(selectedEl.id, { letterSpacing: Number(e.target.value) })} />
                    </div>
                    <div className="flex-1 bg-[#1e1e2c] border border-gray-600 rounded-lg p-2 flex items-center gap-2">
                      <span className="text-xs">A̲</span>
                      <input type="number" step="0.1" className="w-full bg-transparent outline-none text-white text-sm" value={selectedEl?.lineHeight || 1.2} onChange={(e) => selectedEl && updateElement(selectedEl.id, { lineHeight: Number(e.target.value) })} />
                    </div>
                    <button className="w-10 h-10 rounded text-center shrink-0 border border-gray-600 relative overflow-hidden">
                      <input type="color" className="absolute -inset-2 w-16 h-16 cursor-pointer" value={selectedEl?.color || "#ffffff"} onChange={(e) => selectedEl && updateElement(selectedEl.id, { color: e.target.value })} />
                    </button>
                  </div>
                </div>

                {/* Layout */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase text-gray-300 flex items-center gap-1.5"><ChevronDown size={14} /> Layout</div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Text Sizing</span>
                    <div className="flex bg-[#1e1e2c] rounded-md p-1">
                      {["Dynamic", "Box", "Fixed"].map(tm => (
                        <button key={tm} onClick={() => selectedEl && updateElement(selectedEl.id, { textSizing: tm as any })} className={`px-2 py-1 rounded text-xs transition ${selectedEl?.textSizing === tm ? "bg-[#3a3b4c]" : "hover:bg-white/5"}`}>{tm}</button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm mt-3">
                    <span className="text-gray-400">Alignment</span>
                    <div className="grid grid-cols-3 gap-1 bg-[#1e1e2c] rounded-md p-1">
                      <button onClick={() => selectedEl && updateElement(selectedEl.id, { textAlign: 'left' })} className={`p-1.5 rounded transition ${selectedEl?.textAlign === 'left' ? "bg-[#3a3b4c]" : "hover:bg-white/5"}`}><AlignLeft size={16} /></button>
                      <button onClick={() => selectedEl && updateElement(selectedEl.id, { textAlign: 'center' })} className={`p-1.5 rounded transition ${selectedEl?.textAlign === 'center' ? "bg-[#3a3b4c]" : "hover:bg-white/5"}`}><AlignCenter size={16} /></button>
                      <button onClick={() => selectedEl && updateElement(selectedEl.id, { textAlign: 'right' })} className={`p-1.5 rounded transition ${selectedEl?.textAlign === 'right' ? "bg-[#3a3b4c]" : "hover:bg-white/5"}`}><AlignRight size={16} /></button>
                      <button onClick={() => selectedEl && updateElement(selectedEl.id, { alignVertical: 'top' })} className={`p-1.5 rounded transition ${selectedEl?.alignVertical === 'top' ? "bg-[#3a3b4c]" : "hover:bg-white/5"}`}><AlignVerticalJustifyStart size={16} /></button>
                      <button onClick={() => selectedEl && updateElement(selectedEl.id, { alignVertical: 'middle' })} className={`p-1.5 rounded transition ${selectedEl?.alignVertical === 'middle' ? "bg-[#3a3b4c]" : "hover:bg-white/5"}`}><AlignVerticalJustifyCenter size={16} /></button>
                      <button onClick={() => selectedEl && updateElement(selectedEl.id, { alignVertical: 'bottom' })} className={`p-1.5 rounded transition ${selectedEl?.alignVertical === 'bottom' ? "bg-[#3a3b4c]" : "hover:bg-white/5"}`}><AlignVerticalJustifyEnd size={16} /></button>
                    </div>
                  </div>
                </div>

                  </>
                )}

                {selectedEl.type === "rect" && (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold uppercase text-gray-300 flex items-center gap-1.5"><ChevronDown size={14} /> Style</div>
                    <div className="flex gap-4 items-center text-gray-400">
                      <div className="flex flex-col gap-1 w-full relative">
                        <span className="text-xs text-gray-400">Color</span>
                        <div className="w-full h-10 rounded-lg shrink-0 border border-gray-600 relative overflow-hidden bg-white/5 flex items-center px-3">
                          <input type="color" className="absolute -inset-2 w-[200%] h-16 cursor-pointer opacity-0" value={selectedEl.color || "#8356F3"} onChange={(e) => updateElement(selectedEl.id, { color: e.target.value })} />
                          <div className="w-5 h-5 rounded-full border border-white/20 mr-3" style={{backgroundColor: selectedEl.color || "#8356F3"}}></div>
                          <span className="text-sm uppercase text-gray-300">{selectedEl.color || "#8356F3"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Position */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase text-gray-300 flex items-center gap-1.5"><ChevronDown size={14} /> Position</div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex bg-[#1e1e2c] rounded-lg border border-gray-600 p-2 items-center">
                      <span className="text-gray-400 w-6">X</span>
                      <input type="number" className="w-full bg-transparent outline-none" value={selectedEl?.x || 0} onChange={(e) => selectedEl && updateElement(selectedEl.id, { x: Number(e.target.value) })} />
                    </div>
                    <div className="flex bg-[#1e1e2c] rounded-lg border border-gray-600 p-2 items-center">
                      <span className="text-gray-400 w-6">Y</span>
                      <input type="number" className="w-full bg-transparent outline-none" value={selectedEl?.y || 0} onChange={(e) => selectedEl && updateElement(selectedEl.id, { y: Number(e.target.value) })} />
                    </div>
                    <div className="flex bg-[#1e1e2c] rounded-lg border border-gray-600 p-2 items-center">
                      <span className="text-gray-400 w-6">W</span>
                      <input type="number" className="w-full bg-transparent outline-none" value={selectedEl?.width || 0} onChange={(e) => selectedEl && updateElement(selectedEl.id, { width: Number(e.target.value) })} />
                      <div className="flex flex-col ml-1">
                        <button type="button" className="text-xs text-gray-400 hover:text-white leading-none" onClick={() => nudgeSelectedSize("width", 4)}>+</button>
                        <button type="button" className="text-xs text-gray-400 hover:text-white leading-none" onClick={() => nudgeSelectedSize("width", -4)}>-</button>
                      </div>
                    </div>
                    <div className="flex bg-[#1e1e2c] rounded-lg border border-gray-600 p-2 items-center">
                      <span className="text-gray-400 w-6">H</span>
                      <input type="number" className="w-full bg-transparent outline-none" value={selectedEl?.height || 0} onChange={(e) => selectedEl && updateElement(selectedEl.id, { height: Number(e.target.value) })} />
                      <div className="flex flex-col ml-1">
                        <button type="button" className="text-xs text-gray-400 hover:text-white leading-none" onClick={() => nudgeSelectedSize("height", 4)}>+</button>
                        <button type="button" className="text-xs text-gray-400 hover:text-white leading-none" onClick={() => nudgeSelectedSize("height", -4)}>-</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Settings & Effects */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase text-gray-300 flex items-center gap-1.5"><ChevronDown size={14} /> Opacity</div>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[selectedEl?.opacity || 100]} max={100} step={1}
                      onValueChange={(v) => selectedEl && updateElement(selectedEl.id, { opacity: v[0] })}
                    />
                    <span className="bg-[#1e1e2c] border border-gray-600 px-3 py-1 rounded-lg text-sm">{selectedEl?.opacity || 100}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-gray-700">
                  <div className="flex items-center justify-between text-sm"><span>Drop Shadow</span> <Switch checked={selectedEl?.dropShadow} onCheckedChange={(v) => selectedEl && updateElement(selectedEl.id, { dropShadow: v })} /></div>
                  <div className="flex items-center justify-between text-sm"><span>Stroke</span> <Switch checked={selectedEl?.stroke} onCheckedChange={(v) => selectedEl && updateElement(selectedEl.id, { stroke: v })} /></div>
                  <div className="flex items-center justify-between text-sm"><span>Warp</span> <Switch checked={selectedEl?.warp} onCheckedChange={(v) => selectedEl && updateElement(selectedEl.id, { warp: v })} /></div>
                  <div className="flex items-center justify-between text-sm"><span>Text on a Circle</span> <Switch checked={selectedEl?.textOnCircle} onCheckedChange={(v) => selectedEl && updateElement(selectedEl.id, { textOnCircle: v })} /></div>
                  <div className="flex items-center justify-between text-sm"><span>Background Shape</span> <Switch checked={selectedEl?.backgroundShape} onCheckedChange={(v) => selectedEl && updateElement(selectedEl.id, { backgroundShape: v })} /></div>
                </div>

              </div>
            </div>
          ) : activeTool === "Template" ? (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-gray-700 tracking-wide font-semibold text-lg">
                Templates
              </div>
              <div className="p-4 border-b border-gray-700/70 space-y-3">
                <Input
                  value={templateQuery}
                  onChange={(e) => setTemplateQuery(e.target.value)}
                  placeholder="Search templates..."
                  className="bg-[#1e1e2c] border-gray-600 text-white"
                />
                <div className="flex gap-2">
                  <Input
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="Template name"
                    className="bg-[#1e1e2c] border-gray-600 text-white"
                  />
                  <Button
                    onClick={saveCurrentAsTemplate}
                    className="bg-purple-600 hover:bg-purple-700 text-white whitespace-nowrap"
                  >
                    Save
                  </Button>
                </div>
                {templateFeedback && (
                  <p className="text-xs text-purple-300">{templateFeedback}</p>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {filteredTemplates.map((template) => (
                  (() => {
                    const heroTextElement = template.elements.find(
                      (element) =>
                        element.type === "text" &&
                        typeof element.content === "string" &&
                        element.content.trim(),
                    );
                    const previewText = (heroTextElement?.content || template.name)
                      .split("\n")[0]
                      .trim();
                    const previewBgUrl =
                      template.canvasBackground?.type === "image"
                        ? resolveMediaUrl(template.canvasBackground.value)
                        : "";
                    return (
                  <div
                    key={template.id}
                    onClick={() => applyTemplate(template, { enterEditMode: true })}
                    className="w-full text-left bg-[#1e1e2c] border border-gray-700 hover:border-purple-500 rounded-lg p-3 transition-colors cursor-pointer"
                  >
                    <div
                      className="w-full aspect-video rounded-md mb-3 overflow-hidden relative"
                      style={{
                        backgroundColor:
                          template.canvasBackground?.type === "color"
                            ? template.canvasBackground.value
                            : "#171126",
                        backgroundImage: previewBgUrl
                          ? `linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.45) 100%), url("${previewBgUrl}")`
                          : template.preview?.gradient || undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      <div
                        className="absolute inset-x-0 bottom-0 h-1.5"
                        style={{ background: template.preview?.accent || "#8356f3" }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center px-3">
                        <p className="text-white text-base font-semibold text-center leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] line-clamp-2">
                          {previewText}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">{template.name}</p>
                      <span className="text-[10px] uppercase tracking-wide text-gray-400">
                        {template.source}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{template.description}</p>
                  </div>
                    );
                  })()
                ))}
                {!filteredTemplates.length && (
                  <div className="text-center text-sm text-gray-400 py-8">
                    No templates match your search.
                  </div>
                )}
              </div>
            </div>
          ) : activeTool === "Text" ? (
            /* ADD TEXT PANEL */
            <div className="flex flex-col h-full">
              <div className="p-5 border-b border-gray-700 tracking-wide font-semibold text-lg">Text</div>
              <div className="p-4 space-y-3">
                <button onClick={() => addText("headline")} className="w-full bg-[#414258] hover:bg-[#4d4e68] p-4 text-2xl font-bold rounded-lg text-left transition-colors text-white">
                  Add a Headline
                </button>
                <button onClick={() => addText("subhead")} className="w-full bg-[#414258] hover:bg-[#4d4e68] p-3 text-lg font-semibold rounded-lg text-left transition-colors text-white">
                  Add a Subhead
                </button>
                <button onClick={() => addText("body")} className="w-full bg-[#414258] hover:bg-[#4d4e68] p-3 text-sm font-normal rounded-lg text-left transition-colors text-white">
                  Add body text
                </button>
              </div>
            </div>
          ) : activeTool === "Layers" ? (
            /* LAYERS PANEL */
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b border-gray-700 tracking-wide font-semibold text-lg">
                Layers
                <button onClick={() => setActiveTool("")} className="text-gray-400 hover:text-white"><X size={18} /></button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {elements.map((el) => (
                  <div
                    key={el.id}
                    onClick={() => setSelectedId(el.id)}
                    className={`flex items-center justify-between p-3 border-b border-gray-700/50 cursor-pointer transition-colors ${selectedId === el.id ? 'bg-[#414258]' : 'hover:bg-[#3a3b4c]'}`}
                  >
                    <div className="flex items-center gap-3">
                      <FontIcon size={16} className="text-gray-400" />
                      <span className="text-sm font-medium truncate w-24">{el.layerName || el.content?.substring(0, 15) || 'Element'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <button onClick={(e) => { e.stopPropagation(); updateElement(el.id, { hidden: !el.hidden }) }} className="hover:text-white">
                        {el.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); updateElement(el.id, { locked: !el.locked }) }} className="hover:text-white">
                        {el.locked ? <Lock size={14} /> : <Unlock size={14} />}
                      </button>
                      <div className="flex flex-col ml-1">
                        <button onClick={(e) => { e.stopPropagation(); moveLayer(el.id, "up") }} className="hover:text-white"><ChevronUp size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); moveLayer(el.id, "down") }} className="hover:text-white"><ChevronDown size={14} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTool === "Bkground" ? (
            /* BACKGROUND PANEL */
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-gray-700 tracking-wide font-semibold text-lg">Background</div>
              <div className="p-4 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold mb-3">Fill Color</h3>
                  <div className="w-12 h-12 rounded border border-gray-500 overflow-hidden relative cursor-pointer checkboard-pattern">
                    <div className="absolute inset-0 pattern-checks bg-gray-600/30"></div>
                    <input type="color" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => {
                        const color = e.target.value;
                        setCanvasBackground({ type: 'color', value: color });
                        syncState(elements, { type: 'color', value: color });
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">Choose image</h3>
                    <span className="text-xs text-blue-400 cursor-pointer hover:text-blue-300" onClick={() => { setCanvasBackground({ type: 'transparent', value: '' }); syncState(elements, { type: 'transparent', value: '' }); }}>None</span>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white border-0">Browse Media Library</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-5xl w-full h-[85vh] bg-[#0f0920] border-gray-700 p-0 flex flex-col overflow-hidden text-white z-[100]">
                      <DialogHeader className="p-4 border-b border-gray-700">
                        <DialogTitle>Select Background Image</DialogTitle>
                      </DialogHeader>
                      <div className="flex-1 overflow-hidden relative">
                        <MediaBrowserContent
                          currentUser={null}
                          onSelectMedia={(asset: any) => {
                            const url = typeof asset === 'string' ? asset : (asset.url || asset.fileUrl || asset.value);
                            if (url) {
                              setCanvasBackground({ type: 'image', value: url });
                              syncState(elements, { type: 'image', value: url });
                            }
                            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
                          }}
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          ) : activeTool === "Elements" ? (
            /* ELEMENTS PANEL */
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-gray-700 tracking-wide font-semibold text-lg">Elements</div>
              <div className="p-4 space-y-4">
                <h3 className="text-sm font-semibold text-gray-300">Basic Shapes</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button draggable onDragStart={(e) => e.dataTransfer.setData("shape", "square")} onClick={() => addElement("square")} className="bg-[#1e1e2c] border border-gray-600 hover:border-purple-500 hover:bg-[#2a2b3d] p-4 rounded-lg flex flex-col items-center justify-center transition-all cursor-grab active:cursor-grabbing">
                    <Square size={28} className="mb-2 text-purple-400" />
                    <span className="text-xs">Rectangle</span>
                  </button>
                  <button draggable onDragStart={(e) => e.dataTransfer.setData("shape", "circle")} onClick={() => addElement("circle")} className="bg-[#1e1e2c] border border-gray-600 hover:border-purple-500 hover:bg-[#2a2b3d] p-4 rounded-lg flex flex-col items-center justify-center transition-all cursor-grab active:cursor-grabbing">
                    <div className="w-7 h-7 rounded-full border-[2.5px] border-orange-400 mb-2 pointer-events-none"></div>
                    <span className="text-xs">Circle</span>
                  </button>
                  <button draggable onDragStart={(e) => e.dataTransfer.setData("shape", "triangle")} onClick={() => addElement("triangle")} className="bg-[#1e1e2c] border border-gray-600 hover:border-purple-500 hover:bg-[#2a2b3d] p-4 rounded-lg flex flex-col items-center justify-center transition-all cursor-grab active:cursor-grabbing">
                    <div className="w-7 h-7 mb-2 bg-yellow-400 pointer-events-none" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></div>
                    <span className="text-xs">Triangle</span>
                  </button>
                  <button draggable onDragStart={(e) => e.dataTransfer.setData("shape", "star")} onClick={() => addElement("star")} className="bg-[#1e1e2c] border border-gray-600 hover:border-purple-500 hover:bg-[#2a2b3d] p-4 rounded-lg flex flex-col items-center justify-center transition-all cursor-grab active:cursor-grabbing">
                    <div className="w-7 h-7 mb-2 bg-pink-400 pointer-events-none" style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }}></div>
                    <span className="text-xs">Star</span>
                  </button>
                  <button draggable onDragStart={(e) => e.dataTransfer.setData("shape", "line")} onClick={() => addElement("line")} className="bg-[#1e1e2c] border border-gray-600 hover:border-purple-500 hover:bg-[#2a2b3d] p-4 rounded-lg flex flex-col items-center justify-center transition-all col-span-2 cursor-grab active:cursor-grabbing">
                    <div className="w-16 h-1 bg-green-400 mb-2 pointer-events-none"></div>
                    <span className="text-xs">Line</span>
                  </button>
                </div>
              </div>
            </div>
          ) : activeTool === "Images" ? (
            /* IMAGES PANEL */
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-gray-700 tracking-wide font-semibold text-lg">Images</div>
              <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white border-0 mt-2">Browse Media Library</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-5xl w-full h-[85vh] bg-[#0f0920] border-gray-700 p-0 flex flex-col overflow-hidden text-white z-[100]">
                    <DialogHeader className="p-4 border-b border-gray-700">
                      <DialogTitle>Select Image</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden relative">
                      <MediaBrowserContent
                        currentUser={null}
                        onSelectMedia={(asset: any) => {
                          const url = typeof asset === 'string' ? asset : (asset.url || asset.fileUrl || asset.value);
                          if (url) {
                            addImage(url);
                          }
                          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
                        }}
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ) : (
            <div className="p-4">{activeTool} Options Coming Soon</div>
          )}
        </div>
      )}

      {/* Main Canvas Area */}
      <div
        className="flex-1 bg-[#101017] relative flex flex-col overflow-hidden"
        onClick={handleCanvasBackgroundClick}
      >
        <div className="h-14 bg-[#1a1a24] border-b border-[#2a2a3c] flex items-center justify-between px-6 z-10">
          <Input
            value={editingContent.title || "Untitled Presentation"}
            onChange={(e) => {
              const newTitle = e.target.value;
              setEditingContent({ ...editingContent, title: newTitle });
              updateItemContent(editingContent.id, newTitle, editingContent.content, editingContent.slides);
            }}
            className="bg-transparent border-transparent hover:border-gray-600 text-white font-medium text-lg focus:border-[#8356F3] w-64 h-8"
          />
          <div className="flex items-center gap-3">
            {selectedId && (
              <Button onClick={() => { setElements(elements.filter(e => e.id !== selectedId)); setSelectedId(null); syncState(elements.filter(e => e.id !== selectedId), canvasBackground); }} size="sm" variant="ghost" className="text-red-400 hover:bg-red-400/10 hover:text-red-300 px-2"><Trash2 size={18} /></Button>
            )}
            <Button size="sm" className="bg-[#8356F3] hover:bg-[#7145E6] text-white">Close Canvas</Button>
          </div>
        </div>

        {/* The Artboard */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden p-0 flex items-center justify-center relative bg-[#0a0a0f]"
          onClick={handleCanvasBackgroundClick}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const shape = e.dataTransfer.getData("shape");
            if (shape && ["square", "circle", "line", "triangle", "star"].includes(shape)) {
              addElement(shape as any);
            }
            const image = e.dataTransfer.getData("image");
            if (image) {
              addImage(image);
            }
          }}
        >
          <div
            ref={canvasRef}
            className="shadow-2xl relative overflow-hidden transition-transform duration-300 shrink-0 transform-origin-center"
            style={{
              width: `${CANVAS_WIDTH}px`,
              height: `${CANVAS_HEIGHT}px`,
              transform: `scale(${scale})`,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
              backgroundColor: canvasBackground.type === 'color' ? canvasBackground.value : canvasBackground.type === 'transparent' ? '#14141d' : 'transparent',
              backgroundImage: canvasBackground.type === 'image' ? `url("${resolveMediaUrl(canvasBackground.value)}")` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {elements.map((el) => {
              if (el.hidden) return null;
              const isSelected = selectedId === el.id;

              // Construct text shadow or stroke based on effects
              let textShadow = "none";
              if (el.dropShadow) textShadow = "2px 2px 4px rgba(0,0,0,0.5)";
              if (el.stroke) textShadow = "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000";

              return (
                <div
                  key={el.id}
                  onMouseDown={(e) => handleDragStart(e, el.id)}
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute ${el.locked ? '' : 'cursor-move'} ${isSelected ? 'ring-2 ring-[#8356F3]' : 'hover:ring-1 hover:ring-purple-500/50'}`}
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
                        fontFamily: el.fontFamily,
                        fontSize: `${el.fontSize}px`,
                        fontWeight: el.fontWeight,
                        color: el.color,
                        textAlign: el.textAlign,
                        lineHeight: el.lineHeight,
                        letterSpacing: `${el.letterSpacing}px`,
                        textShadow: textShadow,
                      }}
                    >
                      {el.content}
                    </div>
                  )}

                  {el.type === 'image' && (
                    <img src={resolveMediaUrl(el.content)} alt={el.layerName} className="w-full h-full object-cover select-none pointer-events-none" />
                  )}

                  {/* Resize Handles */}
                  {isSelected && !el.locked && (
                    <>
                      <div onMouseDown={(e) => handleResizeStart(e, el.id, "nw")} className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-[#8356F3] rounded-full cursor-nwse-resize" />
                      <div onMouseDown={(e) => handleResizeStart(e, el.id, "ne")} className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-[#8356F3] rounded-full cursor-nesw-resize" />
                      <div onMouseDown={(e) => handleResizeStart(e, el.id, "sw")} className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-[#8356F3] rounded-full cursor-nesw-resize" />
                      <div onMouseDown={(e) => handleResizeStart(e, el.id, "se")} className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-[#8356F3] rounded-full cursor-nwse-resize" />
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
