// Formatting for song lyrics.
//
// Two layers, so a song can be edited in general and line by line:
//   - a base style per section (LyricStyle): applies to the section's whole text, and is what
//     "format the whole song" / "format this section" change;
//   - inline formatting inside a section's text (sanitised HTML, see songRichText.ts): applies
//     to just the words or lines the user selected, on top of the base style.
// A song stores both per section, keyed by the section's name in the lyrics; slides carry them
// as `lyricStyle` and `lyricHtml`.

import type { CSSProperties } from "react";

export type LyricAlign = "left" | "center" | "right" | "justify";
export type LyricCase = "uppercase" | "lowercase" | "capitalize";

export interface LyricStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  fontFamily?: string;
  /** Percent of the screen's normal lyric size (100 = unchanged) */
  fontSize?: number;
  align?: LyricAlign;
  textTransform?: LyricCase;
  /** Line height multiplier, e.g. 1.2 */
  lineHeight?: number;
  /** Extra space between letters, in em, e.g. 0.05 */
  letterSpacing?: number;
}

export const LYRIC_FONTS: { label: string; value: string }[] = [
  { label: "Lufgord", value: "Lufgord" },
  { label: "Arial", value: "Arial" },
  { label: "Helvetica", value: "Helvetica" },
  { label: "Verdana", value: "Verdana" },
  { label: "Tahoma", value: "Tahoma" },
  { label: "Trebuchet MS", value: "Trebuchet MS" },
  { label: "Georgia", value: "Georgia" },
  { label: "Times New Roman", value: "Times New Roman" },
  { label: "Palatino", value: "Palatino Linotype" },
  { label: "Courier New", value: "Courier New" },
  { label: "Impact", value: "Impact" },
];

export const LYRIC_SIZES = [50, 75, 90, 100, 110, 125, 150, 175, 200, 250, 300];

const FONT_FALLBACK: Record<string, string> = {
  Lufgord: "Lufgord, sans-serif",
  Arial: "Arial, Helvetica, sans-serif",
  Helvetica: "Helvetica, Arial, sans-serif",
  Verdana: "Verdana, Geneva, sans-serif",
  Tahoma: "Tahoma, Geneva, sans-serif",
  "Trebuchet MS": '"Trebuchet MS", Helvetica, sans-serif',
  Georgia: "Georgia, serif",
  "Times New Roman": '"Times New Roman", Times, serif',
  "Palatino Linotype": '"Palatino Linotype", Palatino, serif',
  "Courier New": '"Courier New", Courier, monospace',
  Impact: "Impact, Haettenschweiler, sans-serif",
};

/** CSS font stack for a font name chosen in the editor. */
export const fontStack = (name: string): string =>
  FONT_FALLBACK[name] ?? (/\s/.test(name) ? `"${name}"` : name);

const SAFE_COLOR = /^#[0-9a-fA-F]{3,8}$/;

/** CSS for a base style; sizes are relative (em) so they follow the screen's lyric size. */
export const lyricStyleToCss = (style: LyricStyle | undefined): CSSProperties => {
  if (!style) return {};
  const css: CSSProperties = {};
  if (style.bold) css.fontWeight = 700;
  if (style.italic) css.fontStyle = "italic";
  const decoration = [style.underline ? "underline" : "", style.strike ? "line-through" : ""]
    .filter(Boolean)
    .join(" ");
  if (decoration) css.textDecoration = decoration;
  if (style.color && SAFE_COLOR.test(style.color)) css.color = style.color;
  if (style.fontFamily) css.fontFamily = fontStack(style.fontFamily);
  if (style.fontSize && style.fontSize !== 100) css.fontSize = `${style.fontSize / 100}em`;
  if (style.align) css.textAlign = style.align;
  if (style.textTransform) css.textTransform = style.textTransform;
  if (style.lineHeight) css.lineHeight = style.lineHeight;
  if (style.letterSpacing) css.letterSpacing = `${style.letterSpacing}em`;
  return css;
};

const DEFAULTS_TO_DROP: Partial<Record<keyof LyricStyle, unknown>> = {
  fontSize: 100,
  lineHeight: 0,
  letterSpacing: 0,
};

/**
 * Applies a change to a style. Options that are switched off or set back to normal are
 * removed rather than stored, so they keep following the live screen's own settings.
 */
export const mergeLyricStyle = (
  style: LyricStyle | undefined,
  change: LyricStyle,
): LyricStyle | undefined => {
  const next: Record<string, unknown> = { ...style, ...change };
  (Object.keys(next) as (keyof LyricStyle)[]).forEach((key) => {
    const value = next[key];
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      value === false ||
      value === DEFAULTS_TO_DROP[key]
    ) {
      delete next[key];
    }
  });
  return Object.keys(next).length > 0 ? (next as LyricStyle) : undefined;
};

/** The value every style agrees on for each option; options that differ come back unset. */
export const commonLyricStyle = (styles: (LyricStyle | undefined)[]): LyricStyle => {
  if (styles.length === 0) return {};
  const first = styles[0] ?? {};
  const result: Record<string, unknown> = {};
  (
    [
      "bold",
      "italic",
      "underline",
      "strike",
      "color",
      "fontFamily",
      "fontSize",
      "align",
      "textTransform",
      "lineHeight",
      "letterSpacing",
    ] as (keyof LyricStyle)[]
  ).forEach((key) => {
    const agreed = styles.every((style) => (style?.[key] ?? undefined) === (first[key] ?? undefined));
    if (agreed && first[key] !== undefined) result[key] = first[key];
  });
  return result as LyricStyle;
};

/** True when two styles are identical (both unset counts as identical). */
export const sameLyricStyle = (a: LyricStyle | undefined, b: LyricStyle | undefined): boolean =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export interface SongSectionData {
  name: string;
  content: string;
}

/**
 * Copies a saved song's text, base styles and inline formatting onto its slides that are
 * already in the service. Slides are matched to sections by `sectionName`. Slides added before
 * section names were recorded are matched by order, which only works while the song still has
 * as many sections as slides, and only changes a slide whose text is unchanged.
 */
export const applySongToSlides = (
  slides: any[],
  songId: string,
  sections: SongSectionData[],
  styles: Record<string, LyricStyle | undefined>,
  htmlFor: (name: string, content: string) => string | undefined,
): any[] => {
  const mine = slides.filter((slide) => slide?.songId === songId).length;
  const byName = new Map(sections.map((section) => [section.name, section]));
  let position = 0;

  return slides.map((slide) => {
    if (slide?.songId !== songId) return slide;
    const index = position++;

    let section: SongSectionData | undefined;
    let updateText = false;
    if (slide.sectionName != null) {
      section = byName.get(slide.sectionName);
      updateText = true;
    } else if (mine === sections.length) {
      section = sections[index];
      // Only trust the order when the text itself has not changed
      if (section && String(slide.content ?? "").trim() !== section.content.trim()) section = undefined;
    }
    if (!section) return slide;

    const { lyricStyle: _style, lyricHtml: _html, ...rest } = slide;
    const next: Record<string, unknown> = { ...rest };
    if (updateText) next.content = section.content;
    const style = styles[section.name];
    const html = htmlFor(section.name, section.content);
    if (style) next.lyricStyle = style;
    if (html) next.lyricHtml = html;
    return next;
  });
};
