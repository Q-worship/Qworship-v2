import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  useLiveConsoleSettingsStore,
  DEFAULT_LIVE_CONSOLE_SETTINGS,
  DEFAULT_DEFAULT_SCREEN_SETTINGS,
  BLANK_CANVAS_SCREEN_SETTINGS,
  type LiveConsoleSettings,
  type DefaultScreenSettings,
} from "@/stores/useLiveConsoleSettingsStore";
import { BackgroundMediaPicker } from "@/features/mainPresentation/BackgroundMediaPicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  Image as ImageIcon,
  Layout,
  Type,
  Palette,
  Plus,
  Trash2,
  GripVertical,
  Radio,
  Eye,
  EyeOff,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LivePresentationSettingsPageProps {
  onClose: () => void;
}

const TEXT_SIZE_OPTIONS: { value: LiveConsoleSettings["textSize"]; label: string; previewRem: number }[] = [
  { value: "small", label: "Small", previewRem: 1.5 },
  { value: "medium", label: "Medium", previewRem: 1.875 },
  { value: "large", label: "Large", previewRem: 2.25 },
  { value: "extra-large", label: "Extra Large", previewRem: 3 },
  { value: "2x-extra-large", label: "2X Extra Large", previewRem: 3.75 },
  { value: "3x-extra-large", label: "3X Extra Large", previewRem: 4.5 },
  { value: "4x-extra-large", label: "4X Extra Large", previewRem: 6 },
  { value: "5x-extra-large", label: "5X Extra Large", previewRem: 8 },
  { value: "6x-extra-large", label: "6X Extra Large", previewRem: 10 },
];

// ── Gradient Stop ─────────────────────────────────────────────────────────────
interface GradientStop {
  id: string;
  color: string;
  position: number; // 0–100
}

function buildGradientCss(angle: number, stops: GradientStop[]): string {
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  const stopsStr = sorted.map((s) => `${s.color} ${s.position}%`).join(", ");
  return `linear-gradient(${angle}deg, ${stopsStr})`;
}

function parseGradientToState(
  css: string,
): { angle: number; stops: GradientStop[] } | null {
  try {
    const match = css.match(/linear-gradient\((\d+)deg,(.+)\)/);
    if (!match) return null;
    const angle = parseInt(match[1]);
    const stopParts = match[2].split(",").map((s) => s.trim());
    const stops: GradientStop[] = stopParts.map((part, i) => {
      const tokens = part.split(" ");
      const position = parseInt(tokens[tokens.length - 1]);
      const color = tokens.slice(0, tokens.length - 1).join(" ");
      return { id: String(i), color, position };
    });
    return { angle, stops };
  } catch {
    return null;
  }
}

// ── GradientBuilder component ─────────────────────────────────────────────────
function GradientBuilder({
  value,
  onChange,
}: {
  value: string;
  onChange: (css: string) => void;
}) {
  const parsed = parseGradientToState(value);
  const [angle, setAngle] = useState(parsed?.angle ?? 135);
  const [stops, setStops] = useState<GradientStop[]>(
    parsed?.stops ?? [
      { id: "1", color: "#0f0f0f", position: 0 },
      { id: "2", color: "#222244", position: 100 },
    ],
  );

  const emit = useCallback(
    (a: number, s: GradientStop[]) => {
      onChange(buildGradientCss(a, s));
    },
    [onChange],
  );

  const updateAngle = (v: number) => {
    setAngle(v);
    emit(v, stops);
  };

  const updateStop = (id: string, patch: Partial<GradientStop>) => {
    const updated = stops.map((s) => (s.id === id ? { ...s, ...patch } : s));
    setStops(updated);
    emit(angle, updated);
  };

  const addStop = () => {
    const id = Date.now().toString();
    const position = Math.round(
      stops.reduce((sum, s) => sum + s.position, 0) / stops.length,
    );
    const updated = [...stops, { id, color: "#444466", position }];
    setStops(updated);
    emit(angle, updated);
  };

  const removeStop = (id: string) => {
    if (stops.length <= 2) return;
    const updated = stops.filter((s) => s.id !== id);
    setStops(updated);
    emit(angle, updated);
  };

  const gradientPreview = buildGradientCss(angle, stops);

  return (
    <div className="space-y-4">
      <div
        className="w-full h-12 rounded-lg border border-gray-600 shadow-inner"
        style={{ background: gradientPreview }}
      />

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="text-sm text-gray-300">Angle</Label>
          <span className="text-xs font-mono text-purple-300">{angle}°</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={360}
            value={angle}
            onChange={(e) => updateAngle(Number(e.target.value))}
            className="flex-1 h-2 rounded appearance-none bg-gray-700 accent-purple-500 cursor-pointer"
          />
          <div
            className="w-8 h-8 rounded-full border-2 border-gray-600 flex items-center justify-center flex-shrink-0"
            style={{ background: gradientPreview }}
            title={`${angle}°`}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="text-sm text-gray-300">Colour Stops</Label>
          <button
            onClick={addStop}
            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Stop
          </button>
        </div>

        <div className="space-y-2">
          {[...stops]
            .sort((a, b) => a.position - b.position)
            .map((stop) => (
              <div
                key={stop.id}
                className="flex items-center gap-2 bg-[#0a0614] border border-gray-700/60 rounded-lg px-3 py-2"
              >
                <GripVertical className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />

                <div className="relative flex-shrink-0">
                  <div
                    className="w-8 h-8 rounded border border-gray-600 cursor-pointer overflow-hidden"
                    style={{ background: stop.color }}
                  >
                    <input
                      type="color"
                      value={stop.color}
                      onChange={(e) =>
                        updateStop(stop.id, { color: e.target.value })
                      }
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                      title="Pick colour"
                    />
                  </div>
                </div>

                <span className="text-xs font-mono text-gray-400 w-16 flex-shrink-0">
                  {stop.color}
                </span>

                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={stop.position}
                    onChange={(e) =>
                      updateStop(stop.id, { position: Number(e.target.value) })
                    }
                    className="flex-1 h-1.5 rounded appearance-none bg-gray-700 accent-purple-500 cursor-pointer"
                  />
                  <span className="text-xs font-mono text-gray-500 w-8 text-right flex-shrink-0">
                    {stop.position}%
                  </span>
                </div>

                <button
                  onClick={() => removeStop(stop.id)}
                  disabled={stops.length <= 2}
                  className="text-gray-600 hover:text-red-400 transition-colors disabled:opacity-30 flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
        </div>
      </div>

      <div className="bg-[#0a0614] border border-gray-700/60 rounded-lg px-3 py-2">
        <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">
          Generated CSS
        </p>
        <p className="text-xs font-mono text-gray-400 break-all">
          {gradientPreview}
        </p>
      </div>
    </div>
  );
}

// ── ColorPickerField ──────────────────────────────────────────────────────────
function ColorPickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm text-gray-300">{label}</Label>
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <div
            className="w-10 h-10 rounded border border-gray-600 cursor-pointer overflow-hidden shadow-inner"
            style={{ background: value }}
          >
            <input
              type="color"
              value={value.startsWith("#") ? value : "#ffffff"}
              onChange={(e) => onChange(e.target.value)}
              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              title="Pick colour"
            />
          </div>
        </div>
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-[#0a0614] border-gray-700 text-white font-mono text-sm"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

// ── Auto-fit text size ─────────────────────────────────────────────────────────
// Iteratively reduces genuine font-size (not a CSS transform - transform:
// scale() blurs/garbles bold-italic serif text when scaled to extreme
// ratios, since the browser rasterizes at the original size and scales the
// bitmap down instead of re-rendering crisp glyphs at the target size) on
// whatever `applySize` controls, until `measureRef`'s rendered box fits
// inside `containerRef` on both axes. Re-measures on container resize and
// whenever `deps` change (text content, tier, font, box size...).
function useAutoFitTextSize(
  containerRef: React.RefObject<HTMLElement>,
  measureRef: React.RefObject<HTMLElement>,
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

// ── ResizableBox ─────────────────────────────────────────────────────────────
// A box sized as a % of `previewBoxRef`, draggable from all 8 edges/corners.
// Drag updates the box's live DOM size directly (so ResizeObserver-driven
// auto-fit reflows text in real time as the user drags), then commits the
// final size back as a % via onResizeEnd on release.
function ResizableBox({
  boxRef,
  widthPct,
  heightPct,
  previewBoxRef,
  onResizeEnd,
  className,
  children,
}: {
  boxRef: React.RefObject<HTMLDivElement>;
  widthPct: number;
  heightPct: number;
  previewBoxRef: React.RefObject<HTMLElement>;
  onResizeEnd: (widthPct: number, heightPct: number) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const startResize = (edge: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const previewBox = previewBoxRef.current;
    const box = boxRef.current;
    if (!previewBox || !box) return;
    const previewRect = previewBox.getBoundingClientRect();
    const startRect = box.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    let finalW = startRect.width;
    let finalH = startRect.height;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      let w = startRect.width;
      let h = startRect.height;
      if (edge.includes("e")) w = startRect.width + dx;
      if (edge.includes("w")) w = startRect.width - dx;
      if (edge.includes("s")) h = startRect.height + dy;
      if (edge.includes("n")) h = startRect.height - dy;
      w = Math.max(previewRect.width * 0.15, Math.min(previewRect.width, w));
      h = Math.max(previewRect.height * 0.08, Math.min(previewRect.height, h));
      finalW = w;
      finalH = h;
      box.style.width = `${w}px`;
      box.style.height = `${h}px`;
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const r = previewBoxRef.current?.getBoundingClientRect();
      if (r) {
        onResizeEnd(
          Math.round((finalW / r.width) * 1000) / 10,
          Math.round((finalH / r.height) * 1000) / 10,
        );
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const handleBase =
    "absolute bg-purple-500 border border-white/70 rounded-sm opacity-0 group-hover:opacity-90 transition-opacity z-20";

  return (
    <div
      ref={boxRef}
      className={`group relative mx-auto ${className ?? ""}`}
      style={{ width: `${widthPct}%`, height: `${heightPct}%` }}
    >
      {children}
      <div onPointerDown={startResize("n")} className={`${handleBase} top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-2 cursor-ns-resize`} />
      <div onPointerDown={startResize("s")} className={`${handleBase} bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-6 h-2 cursor-ns-resize`} />
      <div onPointerDown={startResize("e")} className={`${handleBase} right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-6 cursor-ew-resize`} />
      <div onPointerDown={startResize("w")} className={`${handleBase} left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-6 cursor-ew-resize`} />
      <div onPointerDown={startResize("ne")} className={`${handleBase} top-0 right-0 -translate-y-1/2 translate-x-1/2 w-3 h-3 cursor-nesw-resize`} />
      <div onPointerDown={startResize("nw")} className={`${handleBase} top-0 left-0 -translate-y-1/2 -translate-x-1/2 w-3 h-3 cursor-nwse-resize`} />
      <div onPointerDown={startResize("se")} className={`${handleBase} bottom-0 right-0 translate-y-1/2 translate-x-1/2 w-3 h-3 cursor-nwse-resize`} />
      <div onPointerDown={startResize("sw")} className={`${handleBase} bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-3 h-3 cursor-nesw-resize`} />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function LivePresentationSettingsPage({
  onClose,
}: LivePresentationSettingsPageProps) {
  const { settings, setSettings, defaultScreenSettings, setDefaultScreenSettings } =
    useLiveConsoleSettingsStore();

  // Which screen Background + Typography below are currently editing: the
  // active "Live Web Screen" (slide/song/verse content) or the idle
  // "Default Web Screen" (the "Live Service" screen shown when nothing is
  // being projected).
  const [editTarget, setEditTarget] = useState<"live" | "default">("live");
  const activeSettings: LiveConsoleSettings | DefaultScreenSettings =
    editTarget === "live" ? settings : defaultScreenSettings;

  const handleUpdate = (
    updates: Partial<LiveConsoleSettings> & Partial<DefaultScreenSettings>,
  ) => {
    if (editTarget === "live") setSettings(updates);
    else setDefaultScreenSettings(updates);
  };

  const bgType = activeSettings.backgroundType;
  const activeSize = TEXT_SIZE_OPTIONS.find((o) => o.value === activeSettings.textSize) ?? TEXT_SIZE_OPTIONS[2];

  const previewBg =
    bgType === "gradient"
      ? activeSettings.backgroundValue
      : bgType === "media"
        ? "#000000"
        : activeSettings.backgroundValue || "#000000";

  // Shows hidden Default Web Screen elements as restorable ghosts instead of
  // rendering nothing - toggled by the eye icon on the preview box itself.
  const [revealHidden, setRevealHidden] = useState(false);
  const anythingHidden =
    defaultScreenSettings.titleHidden ||
    defaultScreenSettings.descriptionHidden ||
    defaultScreenSettings.liveBadgeHidden;

  // Auto-fit: preview text is genuinely re-sized (never CSS-transform-scaled)
  // to always stay inside its box, on both axes, at every size preset.
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const liveCardRef = useRef<HTMLDivElement>(null);
  const liveTextRef = useRef<HTMLDivElement>(null);
  const titleBoxRef = useRef<HTMLDivElement>(null);
  const titleTextRef = useRef<HTMLDivElement>(null);
  const descBoxRef = useRef<HTMLDivElement>(null);
  const descTextRef = useRef<HTMLDivElement>(null);

  const liveBaseRem = activeSize.previewRem * 0.45;
  useAutoFitTextSize(
    previewBoxRef,
    liveCardRef,
    (factor) => {
      if (liveTextRef.current) liveTextRef.current.style.fontSize = `${liveBaseRem * factor}rem`;
    },
    [editTarget, settings.hideTextBox, liveBaseRem, activeSettings.fontFamily, activeSettings.bold, activeSettings.italic],
  );

  const titleBaseRem = activeSize.previewRem * 0.45;
  useAutoFitTextSize(
    titleBoxRef,
    titleTextRef,
    (factor) => {
      if (titleTextRef.current) titleTextRef.current.style.fontSize = `${titleBaseRem * factor}rem`;
    },
    [
      editTarget,
      defaultScreenSettings.title,
      defaultScreenSettings.titleHidden,
      defaultScreenSettings.titleBoxWidthPct,
      defaultScreenSettings.titleBoxHeightPct,
      revealHidden,
      titleBaseRem,
      activeSettings.fontFamily,
      activeSettings.bold,
      activeSettings.italic,
    ],
  );

  const descBaseRem = activeSize.previewRem * 0.18;
  useAutoFitTextSize(
    descBoxRef,
    descTextRef,
    (factor) => {
      if (descTextRef.current) descTextRef.current.style.fontSize = `${descBaseRem * factor}rem`;
    },
    [
      editTarget,
      defaultScreenSettings.description,
      defaultScreenSettings.descriptionHidden,
      defaultScreenSettings.descriptionBoxWidthPct,
      defaultScreenSettings.descriptionBoxHeightPct,
      revealHidden,
      descBaseRem,
      activeSettings.fontFamily,
      activeSettings.italic,
    ],
  );

  return (
    <div
      className="flex flex-col min-h-screen bg-[#0f0920]"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* Header */}
      <header className="px-8 py-5 flex justify-between items-center border-b border-gray-700/40 flex-shrink-0 bg-[#0c0718]">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Live Presentation Settings
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Configure the background and typography used on the GO LIVE
            console
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-800/60 px-3 py-1.5 rounded-full border border-gray-700/50">
            <Radio className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Live Console
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Info bar */}
      <div className="px-8 py-4 border-b border-gray-700/30 bg-[#0a0614] flex-shrink-0">
        <p className="text-xs text-gray-500 sm:max-w-xl">
          Changes here apply instantly to an already-open live console, not
          just the next time you press GO LIVE.
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-8 py-8 relative">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ── Settings column ── */}
          <div className="lg:col-span-5 space-y-6">
            {/* Background */}
            <section className="bg-[#120a26] border border-gray-700/40 rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-gray-700/40 flex-wrap">
                <div className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-lg font-semibold text-white">Background</h2>
                </div>
                <div className="flex items-center bg-[#0a0614] border border-gray-700 rounded-full p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setEditTarget("live")}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      editTarget === "live"
                        ? "text-white"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                    style={editTarget === "live" ? { backgroundColor: "#C400E8" } : undefined}
                  >
                    Live Web Screen
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTarget("default")}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      editTarget === "default"
                        ? "text-white"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                    style={editTarget === "default" ? { backgroundColor: "#C400E8" } : undefined}
                  >
                    Default Web Screen
                  </button>
                </div>
              </div>

              {/* Type selector (solid / gradient / media) */}
              <div className="space-y-2">
                <Label className="text-sm text-gray-300">Background Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() =>
                      handleUpdate({
                        backgroundType: "solid",
                        backgroundValue: "#000000",
                        backgroundMediaType: undefined,
                        backgroundMediaId: undefined,
                      })
                    }
                    className={`py-2.5 rounded-lg text-sm font-semibold transition-all border ${
                      bgType === "solid"
                        ? "bg-purple-600/30 border-purple-500 text-purple-300"
                        : "bg-[#0a0614] border-gray-700 text-gray-400 hover:border-gray-500"
                    }`}
                  >
                    Solid Colour
                  </button>
                  <button
                    onClick={() =>
                      handleUpdate({
                        backgroundType: "gradient",
                        backgroundValue:
                          "linear-gradient(135deg, #0f0f0f 0%, #222244 100%)",
                        backgroundMediaType: undefined,
                        backgroundMediaId: undefined,
                      })
                    }
                    className={`py-2.5 rounded-lg text-sm font-semibold transition-all border ${
                      bgType === "gradient"
                        ? "bg-purple-600/30 border-purple-500 text-purple-300"
                        : "bg-[#0a0614] border-gray-700 text-gray-400 hover:border-gray-500"
                    }`}
                  >
                    Gradient
                  </button>
                  <button
                    onClick={() =>
                      handleUpdate({
                        backgroundType: "media",
                      })
                    }
                    className={`py-2.5 rounded-lg text-sm font-semibold transition-all border flex items-center justify-center gap-1.5 ${
                      bgType === "media"
                        ? "bg-purple-600/30 border-purple-500 text-purple-300"
                        : "bg-[#0a0614] border-gray-700 text-gray-400 hover:border-gray-500"
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Media
                  </button>
                </div>
              </div>

              {/* Solid colour picker */}
              {bgType === "solid" && (
                <ColorPickerField
                  label="Background Colour"
                  value={activeSettings.backgroundValue}
                  onChange={(v) => handleUpdate({ backgroundValue: v })}
                />
              )}

              {/* Gradient builder */}
              {bgType === "gradient" && (
                <GradientBuilder
                  value={activeSettings.backgroundValue}
                  onChange={(css) => handleUpdate({ backgroundValue: css })}
                />
              )}

              {/* Media picker */}
              {bgType === "media" && (
                <BackgroundMediaPicker
                  selectedMediaId={activeSettings.backgroundMediaId}
                  selectedMediaSource={activeSettings.backgroundMediaSource}
                  onSelect={({ id, url, mediaType, source }) =>
                    handleUpdate({
                      backgroundValue: url,
                      backgroundMediaType: mediaType,
                      backgroundMediaId: id,
                      backgroundMediaSource: source,
                    })
                  }
                  onClear={() =>
                    handleUpdate({
                      backgroundValue: "",
                      backgroundMediaType: undefined,
                      backgroundMediaId: undefined,
                      backgroundMediaSource: undefined,
                    })
                  }
                />
              )}
            </section>

            {/* Typography */}
            <section className="bg-[#120a26] border border-gray-700/40 rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between gap-2 pb-4 border-b border-gray-700/40">
                <div className="flex items-center gap-2">
                  <Type className="w-5 h-5 text-purple-400" />
                  <h2 className="text-lg font-semibold text-white">Typography</h2>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleUpdate({ bold: !activeSettings.bold })}
                    aria-pressed={activeSettings.bold}
                    title="Bold"
                    className={`w-8 h-8 flex items-center justify-center rounded-lg border font-bold text-sm transition-all ${
                      activeSettings.bold
                        ? "bg-purple-600/30 border-purple-500 text-purple-300"
                        : "bg-[#0a0614] border-gray-700 text-gray-400 hover:border-gray-500"
                    }`}
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdate({ italic: !activeSettings.italic })}
                    aria-pressed={activeSettings.italic}
                    title="Italic"
                    className={`w-8 h-8 flex items-center justify-center rounded-lg border italic text-sm transition-all ${
                      activeSettings.italic
                        ? "bg-purple-600/30 border-purple-500 text-purple-300"
                        : "bg-[#0a0614] border-gray-700 text-gray-400 hover:border-gray-500"
                    }`}
                  >
                    I
                  </button>
                </div>
              </div>

              {editTarget === "default" && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-300">Title</Label>
                    <Input
                      value={defaultScreenSettings.title}
                      onChange={(e) => handleUpdate({ title: e.target.value })}
                      className="bg-[#0a0614] border-gray-700 text-white"
                      placeholder="Live Service"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-300">Subtitle</Label>
                    <Input
                      value={defaultScreenSettings.description}
                      onChange={(e) => handleUpdate({ description: e.target.value })}
                      className="bg-[#0a0614] border-gray-700 text-white"
                      placeholder="Now presenting live to congregation"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label className="text-sm text-gray-300">Font Family</Label>
                <Select
                  value={activeSettings.fontFamily}
                  onValueChange={(val) => handleUpdate({ fontFamily: val })}
                >
                  <SelectTrigger className="bg-[#0a0614] border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a0f2e] border-gray-700 text-white">
                    <SelectItem value="'Inter', sans-serif">Inter</SelectItem>
                    <SelectItem value="'Roboto', sans-serif">Roboto</SelectItem>
                    <SelectItem value="'Playfair Display', serif">
                      Playfair Display
                    </SelectItem>
                    <SelectItem value="'Montserrat', sans-serif">
                      Montserrat
                    </SelectItem>
                    <SelectItem value="'Open Sans', sans-serif">
                      Open Sans
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <ColorPickerField
                label="Text Colour"
                value={activeSettings.fontColor}
                onChange={(v) => handleUpdate({ fontColor: v })}
              />

              <div className="space-y-2">
                <Label className="text-sm text-gray-300">Text Size</Label>
                <Select
                  value={activeSettings.textSize}
                  onValueChange={(val: LiveConsoleSettings["textSize"]) =>
                    handleUpdate({ textSize: val })
                  }
                >
                  <SelectTrigger className="bg-[#0a0614] border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a0f2e] border-gray-700 text-white">
                    {TEXT_SIZE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-gray-500">
                  Matches the same size scale used by the live console's own
                  in-session text size control.
                </p>
              </div>
            </section>

            {/* Text box - Live Web Screen only; the idle Default Web Screen has no slide text box to strip */}
            {editTarget === "live" && (
              <section className="bg-[#120a26] border border-gray-700/40 rounded-xl p-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.hideTextBox}
                    onChange={(e) => handleUpdate({ hideTextBox: e.target.checked })}
                    className="mt-0.5 w-4 h-4 rounded accent-purple-500 cursor-pointer"
                  />
                  <span>
                    <span className="block text-sm text-gray-200 font-medium">
                      Remove background box around text
                    </span>
                    <span className="block text-xs text-gray-500 mt-0.5">
                      Strips the dark rounded panel (fill and border) that
                      normally wraps projected slide text, leaving bare text
                      over the background.
                    </span>
                  </span>
                </label>
              </section>
            )}
          </div>

          {/* ── Preview column ── */}
          <section className="lg:col-span-7 sticky top-0 bg-[#120a26] border border-gray-700/40 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-gray-700/40 flex-wrap">
              <div className="flex items-center gap-2">
                <Layout className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-semibold text-white">
                  {editTarget === "live" ? "Live Console Preview" : "Default Web Screen Preview"}
                </h2>
              </div>
              {editTarget === "default" && (
                <Select
                  value={defaultScreenSettings.preset}
                  onValueChange={(val: "default" | "blank") =>
                    handleUpdate(
                      val === "blank" ? BLANK_CANVAS_SCREEN_SETTINGS : DEFAULT_DEFAULT_SCREEN_SETTINGS,
                    )
                  }
                >
                  <SelectTrigger className="w-[168px] h-8 text-xs bg-[#0a0614] border-gray-700 text-white">
                    <SelectValue placeholder="Presets" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a0f2e] border-gray-700 text-white">
                    <SelectItem value="default">Default System</SelectItem>
                    <SelectItem value="blank">Blank Canvas</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div
              ref={previewBoxRef}
              className="relative w-full aspect-video rounded-lg overflow-hidden border border-gray-600 shadow-2xl flex items-center justify-center"
              style={{ background: previewBg, padding: "6% 10%" }}
            >
              {bgType === "media" &&
                activeSettings.backgroundValue &&
                (activeSettings.backgroundMediaType === "video" ? (
                  <video
                    key={activeSettings.backgroundValue}
                    src={activeSettings.backgroundValue}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover z-0"
                  />
                ) : (
                  <img
                    src={activeSettings.backgroundValue}
                    alt="Background"
                    className="absolute inset-0 w-full h-full object-cover z-0"
                  />
                ))}

              {editTarget === "default" && (
                <button
                  type="button"
                  onClick={() => setRevealHidden((v) => !v)}
                  title={
                    revealHidden
                      ? "Hide the restore overlay"
                      : anythingHidden
                        ? "Show hidden elements so you can restore them"
                        : "Nothing is hidden right now"
                  }
                  className={`absolute top-2 right-2 z-30 p-1.5 rounded-full transition-colors ${
                    revealHidden
                      ? "bg-purple-600 text-white"
                      : "bg-black/50 text-white/70 hover:text-white hover:bg-black/70"
                  } ${anythingHidden && !revealHidden ? "ring-1 ring-purple-400" : ""}`}
                >
                  {revealHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}

              {editTarget === "live" ? (
                <div
                  ref={liveCardRef}
                  className={`relative z-10 ${
                    settings.hideTextBox
                      ? ""
                      : "bg-black/60 backdrop-blur-sm rounded-2xl border border-white/10 shadow-2xl p-8"
                  }`}
                >
                  <div
                    ref={liveTextRef}
                    className="text-center whitespace-pre-wrap leading-relaxed"
                    style={{
                      color: activeSettings.fontColor,
                      fontFamily: activeSettings.fontFamily,
                      fontWeight: activeSettings.bold ? 700 : 300,
                      fontStyle: activeSettings.italic ? "italic" : "normal",
                    }}
                  >
                    For God so loved the world that he gave his one and only
                    Son, that whoever believes in him shall not perish but have
                    eternal life.
                    <div className="text-[0.5em] opacity-80 mt-2 font-medium tracking-wide">
                      John 3:16 — KJV
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative z-10 w-full h-full flex flex-col items-center justify-center gap-2">
                  {(!defaultScreenSettings.titleHidden || revealHidden) && (
                    <ResizableBox
                      boxRef={titleBoxRef}
                      widthPct={defaultScreenSettings.titleBoxWidthPct ?? 90}
                      heightPct={defaultScreenSettings.titleBoxHeightPct ?? 38}
                      previewBoxRef={previewBoxRef}
                      onResizeEnd={(w, h) =>
                        handleUpdate({ titleBoxWidthPct: w, titleBoxHeightPct: h })
                      }
                    >
                      <div
                        className={`w-full h-full flex items-center justify-center rounded-lg ${
                          defaultScreenSettings.titleHidden
                            ? "opacity-40 border-2 border-dashed border-purple-400"
                            : ""
                        }`}
                      >
                        <div
                          ref={titleTextRef}
                          contentEditable={!defaultScreenSettings.titleHidden}
                          suppressContentEditableWarning
                          title="Click to edit the title"
                          onBlur={(e) => {
                            const val =
                              e.currentTarget.textContent?.trim() ||
                              DEFAULT_DEFAULT_SCREEN_SETTINGS.title;
                            handleUpdate({ title: val });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              (e.currentTarget as HTMLElement).blur();
                            }
                          }}
                          className={`outline-none whitespace-pre-wrap text-center rounded-lg px-2 transition-colors ${
                            defaultScreenSettings.titleHidden
                              ? "pointer-events-none"
                              : "cursor-text hover:bg-white/5 focus:bg-white/10 focus:ring-1 focus:ring-purple-400"
                          }`}
                          style={{
                            color: activeSettings.fontColor,
                            fontFamily: activeSettings.fontFamily,
                            fontWeight: activeSettings.bold ? 700 : 300,
                            fontStyle: activeSettings.italic ? "italic" : "normal",
                          }}
                        >
                          {defaultScreenSettings.title}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdate({ titleHidden: !defaultScreenSettings.titleHidden })
                        }
                        title={defaultScreenSettings.titleHidden ? "Restore title" : "Hide title"}
                        className={`absolute -top-2 -right-2 z-20 p-1 rounded-full bg-black/60 text-white/80 hover:text-white hover:bg-black/80 transition-opacity ${
                          defaultScreenSettings.titleHidden
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        {defaultScreenSettings.titleHidden ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </ResizableBox>
                  )}

                  {(!defaultScreenSettings.descriptionHidden || revealHidden) && (
                    <ResizableBox
                      boxRef={descBoxRef}
                      widthPct={defaultScreenSettings.descriptionBoxWidthPct ?? 85}
                      heightPct={defaultScreenSettings.descriptionBoxHeightPct ?? 18}
                      previewBoxRef={previewBoxRef}
                      onResizeEnd={(w, h) =>
                        handleUpdate({ descriptionBoxWidthPct: w, descriptionBoxHeightPct: h })
                      }
                    >
                      <div
                        className={`w-full h-full flex items-center justify-center rounded-lg ${
                          defaultScreenSettings.descriptionHidden
                            ? "opacity-40 border-2 border-dashed border-purple-400"
                            : ""
                        }`}
                      >
                        <div
                          ref={descTextRef}
                          contentEditable={!defaultScreenSettings.descriptionHidden}
                          suppressContentEditableWarning
                          title="Click to edit the description"
                          onBlur={(e) => {
                            const val =
                              e.currentTarget.textContent?.trim() ||
                              DEFAULT_DEFAULT_SCREEN_SETTINGS.description;
                            handleUpdate({ description: val });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              (e.currentTarget as HTMLElement).blur();
                            }
                          }}
                          className={`outline-none whitespace-pre-wrap text-center rounded-lg px-2 opacity-80 transition-colors ${
                            defaultScreenSettings.descriptionHidden
                              ? "pointer-events-none"
                              : "cursor-text hover:bg-white/5 hover:opacity-100 focus:bg-white/10 focus:opacity-100 focus:ring-1 focus:ring-purple-400"
                          }`}
                          style={{
                            color: activeSettings.fontColor,
                            fontFamily: activeSettings.fontFamily,
                            fontStyle: activeSettings.italic ? "italic" : "normal",
                          }}
                        >
                          {defaultScreenSettings.description}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdate({
                            descriptionHidden: !defaultScreenSettings.descriptionHidden,
                          })
                        }
                        title={
                          defaultScreenSettings.descriptionHidden
                            ? "Restore description"
                            : "Hide description"
                        }
                        className={`absolute -top-2 -right-2 z-20 p-1 rounded-full bg-black/60 text-white/80 hover:text-white hover:bg-black/80 transition-opacity ${
                          defaultScreenSettings.descriptionHidden
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        {defaultScreenSettings.descriptionHidden ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </ResizableBox>
                  )}

                  {(!defaultScreenSettings.liveBadgeHidden || revealHidden) && (
                    <div
                      className={`group relative flex items-center justify-center gap-2 mt-1 px-3 py-1 rounded-full ${
                        defaultScreenSettings.liveBadgeHidden
                          ? "opacity-40 border-2 border-dashed border-purple-400"
                          : ""
                      }`}
                    >
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-red-400 text-sm font-medium">LIVE</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdate({ liveBadgeHidden: !defaultScreenSettings.liveBadgeHidden })
                        }
                        title={
                          defaultScreenSettings.liveBadgeHidden
                            ? "Restore LIVE badge"
                            : "Hide LIVE badge"
                        }
                        className={`absolute -top-2 -right-2 z-20 p-1 rounded-full bg-black/60 text-white/80 hover:text-white hover:bg-black/80 transition-opacity ${
                          defaultScreenSettings.liveBadgeHidden
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        {defaultScreenSettings.liveBadgeHidden ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center text-xs text-gray-500 flex-wrap gap-2">
              <span>
                {editTarget === "live"
                  ? "Preview is scaled and applies instantly to the live console."
                  : "Click text to edit, drag box edges to resize, hover for the hide icon. What's shown here is exactly what's shown live."}
              </span>
              <button
                onClick={() =>
                  handleUpdate(
                    editTarget === "live"
                      ? DEFAULT_LIVE_CONSOLE_SETTINGS
                      : DEFAULT_DEFAULT_SCREEN_SETTINGS,
                  )
                }
                className="text-red-400 hover:text-red-300 underline"
              >
                Reset to Defaults
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
