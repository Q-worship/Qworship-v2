import type { LyricStyle } from "./songFormatting";
import { lyricHtmlForSection } from "./songRichText";

interface SongWithFormatting {
  sectionStyles?: Record<string, LyricStyle | undefined>;
  sectionHtml?: Record<string, string>;
}

/** The formatting a song section brings to the screen: its base style and inline formatting. */
export interface SectionFormat {
  lyricStyle?: LyricStyle;
  lyricHtml?: string;
}

/**
 * The formatting saved with a song for one of its sections (keyed by the section's name in the
 * lyrics). Inline formatting is only included while it still matches the section's text.
 * Every route that puts a song on screen (slides, songbook, live console) uses this, so they
 * all show the same thing.
 */
export const sectionFormat = (
  song: SongWithFormatting | null | undefined,
  sectionName: string,
  content: string,
): SectionFormat => {
  const format: SectionFormat = {};
  const style = song?.sectionStyles?.[sectionName];
  if (style && Object.keys(style).length > 0) format.lyricStyle = style;
  const html = lyricHtmlForSection(song, sectionName, content);
  if (html) format.lyricHtml = html;
  return format;
};

/** Extra fields for a song slide: the section's name (to match edits later) and its formatting. */
export const songSlideFormatting = (
  song: SongWithFormatting | null | undefined,
  sectionName: string,
  content: string,
): SectionFormat & { sectionName: string } => ({
  sectionName,
  ...sectionFormat(song, sectionName, content),
});
