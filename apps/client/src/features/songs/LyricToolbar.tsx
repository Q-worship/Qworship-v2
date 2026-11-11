import React from "react";
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  Strikethrough as StrikeIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import { LYRIC_FONTS, LYRIC_SIZES, type LyricAlign, type LyricCase, type LyricStyle } from "./songFormatting";

export interface LyricToolbarProps {
  /** What the toolbar is changing right now: "Whole song", a section, or "Selected text" */
  scopeLabel: string;
  /** True when words are selected, so the toolbar formats just those */
  inlineActive: boolean;
  /** Can go back to formatting the whole song */
  canFormatWholeSong: boolean;
  /** The formatting at the current scope */
  shown: LyricStyle;
  canClear: boolean;
  onWholeSong: () => void;
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onStrike: () => void;
  onColor: (hex: string) => void;
  onHighlight: (hex: string) => void;
  onFontFamily: (name: string) => void;
  onFontSize: (percent: number) => void;
  onAlign: (align: LyricAlign) => void;
  onCase: (value: LyricCase | undefined) => void;
  onLineHeight: (value: number | undefined) => void;
  onLetterSpacing: (value: number | undefined) => void;
  onClear: () => void;
}

const LINE_HEIGHTS = [1, 1.2, 1.4, 1.6, 2];
const LETTER_SPACINGS: { label: string; value: number }[] = [
  { label: "Tight", value: -0.03 },
  { label: "Wide", value: 0.05 },
  { label: "Wider", value: 0.1 },
];

// Buttons must not take focus from the lyric box, or the selected words would be lost
const keepSelection = (event: React.MouseEvent) => event.preventDefault();

const toolButton = (active: boolean) =>
  `h-7 w-7 rounded flex items-center justify-center transition-colors ${
    active ? "bg-[#8356F3] text-white" : "bg-[#2a1f4b] text-gray-300 hover:bg-[#4a3a75]"
  }`;

const selectClass =
  "h-7 rounded bg-[#2a1f4b] border border-gray-500 text-xs text-white px-1 outline-none focus:border-[#8356F3]";

const Divider = () => <span className="h-5 w-px bg-gray-500 mx-0.5" aria-hidden="true" />;

export const LyricToolbar: React.FC<LyricToolbarProps> = (props) => {
  const { shown } = props;
  const sizeValue = shown.fontSize && LYRIC_SIZES.includes(shown.fontSize) ? shown.fontSize : "";

  return (
    <div
      className="bg-[#3d3166] border border-gray-500 rounded p-2 space-y-2"
      role="toolbar"
      aria-label="Lyric formatting"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-gray-300">Formatting</span>
        <span className="font-semibold px-2 py-0.5 rounded bg-[#2a1f4b] text-white">{props.scopeLabel}</span>
        {props.canFormatWholeSong && (
          <button
            type="button"
            onClick={props.onWholeSong}
            className="text-[11px] text-[#c4b0ff] hover:underline"
          >
            Format whole song
          </button>
        )}
        <span className="text-[11px] text-gray-400 ml-auto">
          {props.inlineActive
            ? "Changes apply to the selected text"
            : "Select words or lines to format just those"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <select
          aria-label="Font"
          title="Font"
          value={shown.fontFamily ?? ""}
          onChange={(e) => props.onFontFamily(e.target.value)}
          className={`${selectClass} w-32`}
        >
          <option value="">Font</option>
          {LYRIC_FONTS.map((font) => (
            <option key={font.value} value={font.value} className="bg-[#2d1f4a]">
              {font.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Size"
          title="Size"
          value={sizeValue}
          onChange={(e) => props.onFontSize(Number(e.target.value))}
          className={`${selectClass} w-[4.5rem]`}
        >
          <option value="">Size</option>
          {LYRIC_SIZES.map((size) => (
            <option key={size} value={size} className="bg-[#2d1f4a]">
              {size}%
            </option>
          ))}
        </select>

        <Divider />

        <button type="button" onMouseDown={keepSelection} onClick={props.onBold} aria-label="Bold" aria-pressed={!!shown.bold} title="Bold (Ctrl+B)" className={toolButton(!!shown.bold)}>
          <BoldIcon size={14} />
        </button>
        <button type="button" onMouseDown={keepSelection} onClick={props.onItalic} aria-label="Italic" aria-pressed={!!shown.italic} title="Italic (Ctrl+I)" className={toolButton(!!shown.italic)}>
          <ItalicIcon size={14} />
        </button>
        <button type="button" onMouseDown={keepSelection} onClick={props.onUnderline} aria-label="Underline" aria-pressed={!!shown.underline} title="Underline (Ctrl+U)" className={toolButton(!!shown.underline)}>
          <UnderlineIcon size={14} />
        </button>
        <button type="button" onMouseDown={keepSelection} onClick={props.onStrike} aria-label="Strikethrough" aria-pressed={!!shown.strike} title="Strikethrough" className={toolButton(!!shown.strike)}>
          <StrikeIcon size={14} />
        </button>

        <Divider />

        <label title="Text colour" className="relative h-7 w-7 rounded overflow-hidden border border-gray-500 cursor-pointer flex items-center justify-center bg-[#2a1f4b]">
          <span className="text-xs font-bold" style={{ color: shown.color || "#ffffff" }}>A</span>
          <span className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: shown.color || "#ffffff" }} />
          <input
            type="color"
            aria-label="Text colour"
            value={shown.color || "#ffffff"}
            onChange={(e) => props.onColor(e.target.value)}
            className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
          />
        </label>
        <label
          title={props.inlineActive ? "Highlight colour" : "Select some words to highlight them"}
          className={`relative h-7 w-7 rounded overflow-hidden border border-gray-500 flex items-center justify-center bg-[#2a1f4b] ${
            props.inlineActive ? "cursor-pointer" : "opacity-40 cursor-not-allowed"
          }`}
        >
          <span className="px-0.5 bg-yellow-300 text-black text-[11px] font-bold leading-none">ab</span>
          <input
            type="color"
            aria-label="Highlight colour"
            disabled={!props.inlineActive}
            defaultValue="#ffe066"
            onChange={(e) => props.onHighlight(e.target.value)}
            className="absolute inset-0 h-full w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
        </label>

        <Divider />

        <button type="button" onMouseDown={keepSelection} onClick={() => props.onAlign("left")} aria-label="Align left" aria-pressed={shown.align === "left"} title="Align left" className={toolButton(shown.align === "left")}>
          <AlignLeft size={14} />
        </button>
        <button type="button" onMouseDown={keepSelection} onClick={() => props.onAlign("center")} aria-label="Align centre" aria-pressed={shown.align === "center"} title="Align centre" className={toolButton(shown.align === "center")}>
          <AlignCenter size={14} />
        </button>
        <button type="button" onMouseDown={keepSelection} onClick={() => props.onAlign("right")} aria-label="Align right" aria-pressed={shown.align === "right"} title="Align right" className={toolButton(shown.align === "right")}>
          <AlignRight size={14} />
        </button>

        <Divider />

        <select
          aria-label="Letter case"
          title="Letter case"
          value={shown.textTransform ?? ""}
          onChange={(e) => props.onCase((e.target.value || undefined) as LyricCase | undefined)}
          className={`${selectClass} w-[5.5rem]`}
        >
          <option value="">Case</option>
          <option value="uppercase" className="bg-[#2d1f4a]">UPPERCASE</option>
          <option value="lowercase" className="bg-[#2d1f4a]">lowercase</option>
          <option value="capitalize" className="bg-[#2d1f4a]">Capitalize</option>
        </select>
        <select
          aria-label="Line spacing"
          title="Line spacing"
          value={shown.lineHeight && LINE_HEIGHTS.includes(shown.lineHeight) ? shown.lineHeight : ""}
          onChange={(e) => props.onLineHeight(e.target.value ? Number(e.target.value) : undefined)}
          className={`${selectClass} w-[5.5rem]`}
        >
          <option value="">Spacing</option>
          {LINE_HEIGHTS.map((value) => (
            <option key={value} value={value} className="bg-[#2d1f4a]">
              Line {value}
            </option>
          ))}
        </select>
        <select
          aria-label="Letter spacing"
          title="Letter spacing"
          value={LETTER_SPACINGS.some((s) => s.value === shown.letterSpacing) ? String(shown.letterSpacing) : ""}
          onChange={(e) => props.onLetterSpacing(e.target.value ? Number(e.target.value) : undefined)}
          className={`${selectClass} w-[5.5rem]`}
        >
          <option value="">Letters</option>
          {LETTER_SPACINGS.map((s) => (
            <option key={s.value} value={String(s.value)} className="bg-[#2d1f4a]">
              {s.label}
            </option>
          ))}
        </select>

        <Divider />

        {props.canClear && (
          <button
            type="button"
            onMouseDown={keepSelection}
            onClick={props.onClear}
            title="Clear formatting"
            className="h-7 px-2 rounded bg-[#2a1f4b] text-xs text-gray-300 hover:bg-[#4a3a75]"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
};
