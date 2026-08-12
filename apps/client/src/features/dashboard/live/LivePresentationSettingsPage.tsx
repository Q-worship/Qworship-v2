import {
  useLiveConsoleSettingsStore,
  DEFAULT_LIVE_CONSOLE_SETTINGS,
  type LiveConsoleSettings,
} from "@/stores/useLiveConsoleSettingsStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Layout, Type, Radio } from "lucide-react";
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

  const activeSize = TEXT_SIZE_OPTIONS.find((o) => o.value === settings.textSize) ?? TEXT_SIZE_OPTIONS[2];

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
            Configure the text styling used on the GO LIVE console
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
            {/* Typography */}
            <section className="bg-[#120a26] border border-gray-700/40 rounded-xl p-6 space-y-5">
              <div className="flex items-center gap-2 pb-4 border-b border-gray-700/40">
                <Type className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-semibold text-white">Typography</h2>
              </div>

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
                value={settings.fontColor}
                onChange={(v) => handleUpdate({ fontColor: v })}
              />

              <div className="space-y-2">
                <Label className="text-sm text-gray-300">Text Size</Label>
                <Select
                  value={settings.textSize}
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

            {/* Text box */}
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
                    over whatever is behind it.
                  </span>
                </span>
              </label>
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

            <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-gray-600 shadow-2xl flex items-center justify-center bg-black p-8">
              <div
                className={
                  settings.hideTextBox
                    ? ""
                    : "bg-black/60 backdrop-blur-sm rounded-2xl border border-white/10 shadow-2xl p-8"
                }
              >
                <div
                  className="text-center whitespace-pre-wrap leading-relaxed"
                  style={{
                    color: settings.fontColor,
                    fontFamily: settings.fontFamily,
                    fontSize: `${activeSize.previewRem * 0.4}rem`,
                    fontWeight: 300,
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
            </div>

            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>Preview is scaled and applies instantly to the live console.</span>
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
