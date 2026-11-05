// Bold / italic / colour for song lyrics. A song stores one style per section (keyed by the
// section's name in the lyrics); slides carry the style of their section as `lyricStyle`.

export interface LyricStyle {
  bold?: boolean;
  italic?: boolean;
  color?: string;
}

/**
 * Applies a change to a style. An option that is switched off is removed rather than
 * stored as false, so it keeps following the live screen's own settings.
 */
export const mergeLyricStyle = (
  style: LyricStyle | undefined,
  change: LyricStyle,
): LyricStyle | undefined => {
  const next: LyricStyle = { ...style, ...change };
  if (!next.bold) delete next.bold;
  if (!next.italic) delete next.italic;
  if (!next.color) delete next.color;
  return Object.keys(next).length > 0 ? next : undefined;
};

/** The value every style agrees on for each option; options that differ come back unset. */
export const commonLyricStyle = (styles: (LyricStyle | undefined)[]): LyricStyle => {
  if (styles.length === 0) return {};
  const first = styles[0] ?? {};
  const same = <K extends keyof LyricStyle>(key: K) =>
    styles.every((style) => (style?.[key] ?? undefined) === (first[key] ?? undefined))
      ? first[key]
      : undefined;
  return { bold: same("bold"), italic: same("italic"), color: same("color") };
};

/** True when two styles are identical (both unset counts as identical). */
export const sameLyricStyle = (a: LyricStyle | undefined, b: LyricStyle | undefined): boolean =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Copies a saved song's formatting onto its slides. Slides are matched to sections by
 * `sectionName`; slides added before section names were recorded fall back to their order,
 * which only works while the song still has as many sections as slides.
 */
export const applySongStylesToSlides = (
  slides: any[],
  songId: string,
  sectionNames: string[],
  styles: Record<string, LyricStyle | undefined>,
): any[] => {
  const mine = slides.filter((slide) => slide?.songId === songId).length;
  let position = 0;
  return slides.map((slide) => {
    if (slide?.songId !== songId) return slide;
    const index = position++;
    const name = slide.sectionName ?? (mine === sectionNames.length ? sectionNames[index] : undefined);
    if (!name) return slide;
    const { lyricStyle: _previous, ...rest } = slide;
    return styles[name] ? { ...rest, lyricStyle: styles[name] } : rest;
  });
};
