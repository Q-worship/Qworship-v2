import { useCallback, useState } from "react";
import {
  useLiveConsoleSettingsStore,
  DEFAULT_LIVE_CONSOLE_SETTINGS,
  type LiveConsoleSettings,
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
  Eye,
  Radio,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LivePresentationSettingsPageProps {
  onClose: () => void;
}

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

// ── Main Component ────────────────────────────────────────────────────────────
export function LivePresentationSettingsPage({
  onClose,
}: LivePresentationSettingsPageProps) {
  const { settings, setSettings } = useLiveConsoleSettingsStore();

  const handleUpdate = (updates: Partial<LiveConsoleSettings>) => {
    setSettings(updates);
  };

  const bgType = settings.backgroundType;

  const previewBg =
    bgType === "transparent"
      ? "transparent"
      : bgType === "gradient"
        ? settings.backgroundValue
        : bgType === "media"
          ? "#000000"
          : settings.backgroundValue || "#000000";

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
            Configure the default background and typography applied when you
            press GO LIVE
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
          These settings become the starting background the next time you press
          GO LIVE. Anything you change from inside the Live Settings panel
          during a live session still takes priority for that session.
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-8 py-8 relative">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ── Settings column ── */}
          <div className="lg:col-span-5 space-y-6">
            {/* Background */}
            <section className="bg-[#120a26] border border-gray-700/40 rounded-xl p-6 space-y-5">
              <div className="flex items-center gap-2 pb-4 border-b border-gray-700/40">
                <Palette className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-semibold text-white">Background</h2>
              </div>

              {/* Type selector (solid / gradient / media / transparent) */}
              <div className="space-y-2">
                <Label className="text-sm text-gray-300">Background Type</Label>
                <div className="grid grid-cols-2 gap-2">
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
                  <button
                    onClick={() =>
                      handleUpdate({
                        backgroundType: "transparent",
                        backgroundValue: "transparent",
                        backgroundMediaType: undefined,
                        backgroundMediaId: undefined,
                      })
                    }
                    className={`py-2.5 rounded-lg text-sm font-semibold transition-all border flex items-center justify-center gap-1.5 ${
                      bgType === "transparent"
                        ? "bg-purple-600/30 border-purple-500 text-purple-300"
                        : "bg-[#0a0614] border-gray-700 text-gray-400 hover:border-gray-500"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Transparent
                  </button>
                </div>
                {bgType === "transparent" && (
                  <p className="text-xs text-gray-500">
                    The live console window will have no background of its own —
                    useful when compositing it over something else (e.g. a
                    capture card or OBS window source with a colour key).
                  </p>
                )}
              </div>

              {/* Text box */}
              <label className="flex items-start gap-3 pt-1 cursor-pointer">
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

              {/* Solid colour picker */}
              {bgType === "solid" && (
                <ColorPickerField
                  label="Background Colour"
                  value={settings.backgroundValue}
                  onChange={(v) => handleUpdate({ backgroundValue: v })}
                />
              )}

              {/* Gradient builder */}
              {bgType === "gradient" && (
                <GradientBuilder
                  value={settings.backgroundValue}
                  onChange={(css) => handleUpdate({ backgroundValue: css })}
                />
              )}

              {/* Media picker */}
              {bgType === "media" && (
                <BackgroundMediaPicker
                  selectedMediaId={settings.backgroundMediaId}
                  selectedMediaSource={settings.backgroundMediaSource}
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
              <div className="flex items-center gap-2 pb-4 border-b border-gray-700/40">
                <Type className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-semibold text-white">Typography</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-gray-300">Font Family</Label>
                  <Select
                    value={settings.fontFamily}
                    onValueChange={(val) => handleUpdate({ fontFamily: val })}
                  >
                    <SelectTrigger className="bg-[#0a0614] border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a0f2e] border-gray-700 text-white">
                      <SelectItem value="'Inter', sans-serif">Inter</SelectItem>
                      <SelectItem value="'Roboto', sans-serif">
                        Roboto
                      </SelectItem>
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

                <div className="space-y-2">
                  <Label className="text-sm text-gray-300">Font Weight</Label>
                  <Select
                    value={settings.fontWeight}
                    onValueChange={(val) => handleUpdate({ fontWeight: val })}
                  >
                    <SelectTrigger className="bg-[#0a0614] border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a0f2e] border-gray-700 text-white">
                      <SelectItem value="400">Regular (400)</SelectItem>
                      <SelectItem value="500">Medium (500)</SelectItem>
                      <SelectItem value="600">SemiBold (600)</SelectItem>
                      <SelectItem value="700">Bold (700)</SelectItem>
                      <SelectItem value="800">ExtraBold (800)</SelectItem>
                      <SelectItem value="900">Black (900)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <ColorPickerField
                label="Text Colour"
                value={settings.fontColor}
                onChange={(v) => handleUpdate({ fontColor: v })}
              />

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-sm text-gray-300">
                    Font Size Range (px)
                  </Label>
                  <span className="text-xs text-gray-500 font-mono">
                    {settings.fontSizeMin} – {settings.fontSizeMax} px
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <p className="text-xs text-gray-500">Minimum</p>
                    <input
                      type="range"
                      min={12}
                      max={200}
                      value={settings.fontSizeMin}
                      onChange={(e) =>
                        handleUpdate({ fontSizeMin: Number(e.target.value) })
                      }
                      className="w-full h-2 rounded appearance-none bg-gray-700 accent-purple-500 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs text-gray-500">Maximum</p>
                    <input
                      type="range"
                      min={24}
                      max={300}
                      value={settings.fontSizeMax}
                      onChange={(e) =>
                        handleUpdate({ fontSizeMax: Number(e.target.value) })
                      }
                      className="w-full h-2 rounded appearance-none bg-gray-700 accent-purple-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-gray-300">
                    Horizontal Align
                  </Label>
                  <Select
                    value={settings.textAlign}
                    onValueChange={(val: any) =>
                      handleUpdate({ textAlign: val })
                    }
                  >
                    <SelectTrigger className="bg-[#0a0614] border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a0f2e] border-gray-700 text-white">
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-gray-300">
                    Vertical Align
                  </Label>
                  <Select
                    value={settings.justifyContent}
                    onValueChange={(val: any) =>
                      handleUpdate({ justifyContent: val })
                    }
                  >
                    <SelectTrigger className="bg-[#0a0614] border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a0f2e] border-gray-700 text-white">
                      <SelectItem value="flex-start">Top</SelectItem>
                      <SelectItem value="center">Middle</SelectItem>
                      <SelectItem value="flex-end">Bottom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>
          </div>

          {/* ── Preview column ── */}
          <section className="lg:col-span-7 sticky top-0 bg-[#120a26] border border-gray-700/40 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 pb-4 border-b border-gray-700/40">
              <Layout className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-white">
                Live Console Preview
              </h2>
            </div>

            <div
              className="relative w-full aspect-video rounded-lg overflow-hidden border border-gray-600 shadow-2xl flex"
              style={{
                background:
                  bgType === "transparent"
                    ? "repeating-conic-gradient(#2a2a2a 0% 25%, #1a1a1a 0% 50%) 50% / 20px 20px"
                    : previewBg,
                justifyContent: settings.justifyContent,
                alignItems:
                  settings.textAlign === "center"
                    ? "center"
                    : settings.textAlign === "right"
                      ? "flex-end"
                      : "flex-start",
                padding: "6% 10%",
              }}
            >
              {bgType === "media" &&
                settings.backgroundValue &&
                (settings.backgroundMediaType === "video" ? (
                  <video
                    key={settings.backgroundValue}
                    src={settings.backgroundValue}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover z-0"
                  />
                ) : (
                  <img
                    src={settings.backgroundValue}
                    alt="Background"
                    className="absolute inset-0 w-full h-full object-cover z-0"
                  />
                ))}

              <div
                className="w-full relative z-10"
                style={{
                  color: settings.fontColor,
                  fontFamily: settings.fontFamily,
                  fontWeight: settings.fontWeight,
                  textAlign: settings.textAlign,
                  fontSize: `clamp(${settings.fontSizeMin * 0.35}px, 3.5vw, ${settings.fontSizeMax * 0.35}px)`,
                  lineHeight: "1.4",
                  whiteSpace: "pre-wrap",
                }}
              >
                For God so loved the world that he gave his one and only Son,
                that whoever believes in him shall not perish but have eternal
                life.
                <div
                  style={{
                    fontSize: "0.5em",
                    opacity: 0.8,
                    marginTop: "0.5em",
                    fontWeight: "500",
                    letterSpacing: "0.05em",
                  }}
                >
                  John 3:16 — KJV
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>
                Preview is scaled. This is the background GO LIVE will start
                with, before any in-session Live Settings changes.
              </span>
              <button
                onClick={() => handleUpdate(DEFAULT_LIVE_CONSOLE_SETTINGS)}
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
