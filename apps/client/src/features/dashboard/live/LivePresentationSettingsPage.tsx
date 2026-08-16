import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  useLiveConsoleSettingsStore,
  DEFAULT_LIVE_CONSOLE_SETTINGS,
  DEFAULT_DEFAULT_SCREEN_SETTINGS,
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

// ── Auto-fit scale ─────────────────────────────────────────────────────────────
// Measures the natural (unscaled) size of `contentRef` against `containerRef`
// and applies a uniform CSS transform: scale() so content never exceeds the
// container on either axis - regardless of text length, font size preset, or
// container size. Guarantees "everything is visible" at every tier instead of
// guessing viewport-relative clamp() values that only account for width.
function useAutoFitScale(
  containerRef: React.RefObject<HTMLElement>,
  contentRef: React.RefObject<HTMLElement>,
  deps: unknown[],
) {
  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const fit = () => {
      content.style.transform = "scale(1)";
      const containerRect = container.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      if (contentRect.width === 0 || contentRect.height === 0) return;
      const scaleX = containerRect.width / contentRect.width;
      const scaleY = containerRect.height / contentRect.height;
      const scale = Math.min(1, scaleX, scaleY);
      content.style.transform = `scale(${scale})`;
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
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

  // Auto-fit: the rendered preview content is scaled to always stay inside
  // the preview box, on both axes, at every text size preset.
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const livePreviewContentRef = useRef<HTMLDivElement>(null);
  const defaultPreviewContentRef = useRef<HTMLDivElement>(null);
  useAutoFitScale(previewBoxRef, livePreviewContentRef, [
    editTarget,
    settings.hideTextBox,
    activeSize.previewRem,
    activeSettings.fontFamily,
    activeSettings.bold,
    activeSettings.italic,
  ]);
  useAutoFitScale(previewBoxRef, defaultPreviewContentRef, [
    editTarget,
    defaultScreenSettings.title,
    defaultScreenSettings.description,
    activeSize.previewRem,
    activeSettings.fontFamily,
    activeSettings.bold,
    activeSettings.italic,
  ]);

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
            <div className="flex items-center gap-2 pb-4 border-b border-gray-700/40">
              <Layout className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-white">
                {editTarget === "live" ? "Live Console Preview" : "Default Web Screen Preview"}
              </h2>
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

              {editTarget === "live" ? (
                <div
                  ref={livePreviewContentRef}
                  className={`relative z-10 ${
                    settings.hideTextBox
                      ? ""
                      : "bg-black/60 backdrop-blur-sm rounded-2xl border border-white/10 shadow-2xl p-8"
                  }`}
                >
                  <div
                    className="text-center whitespace-pre-wrap leading-relaxed"
                    style={{
                      color: activeSettings.fontColor,
                      fontFamily: activeSettings.fontFamily,
                      fontSize: `${activeSize.previewRem * 0.45}rem`,
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
                <div ref={defaultPreviewContentRef} className="relative z-10 text-center">
                  <div
                    contentEditable
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
                    className="outline-none cursor-text whitespace-pre-wrap rounded-lg px-2 -mx-2 hover:bg-white/5 focus:bg-white/10 focus:ring-1 focus:ring-purple-400 transition-colors"
                    style={{
                      color: activeSettings.fontColor,
                      fontFamily: activeSettings.fontFamily,
                      fontSize: `${activeSize.previewRem * 0.45}rem`,
                      fontWeight: activeSettings.bold ? 700 : 300,
                      fontStyle: activeSettings.italic ? "italic" : "normal",
                    }}
                  >
                    {defaultScreenSettings.title}
                  </div>
                  <div
                    contentEditable
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
                    className="outline-none cursor-text whitespace-pre-wrap rounded-lg px-2 -mx-2 mt-2 opacity-80 hover:bg-white/5 hover:opacity-100 focus:bg-white/10 focus:opacity-100 focus:ring-1 focus:ring-purple-400 transition-colors"
                    style={{
                      color: activeSettings.fontColor,
                      fontFamily: activeSettings.fontFamily,
                      fontSize: `${activeSize.previewRem * 0.18}rem`,
                      fontStyle: activeSettings.italic ? "italic" : "normal",
                    }}
                  >
                    {defaultScreenSettings.description}
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-red-400 text-[0.5em] font-medium">LIVE</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>
                {editTarget === "live"
                  ? "Preview is scaled and applies instantly to the live console."
                  : "Click the title or description above to edit them directly. Changes apply instantly to the idle screen shown before anything is projected."}
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
