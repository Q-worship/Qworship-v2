import { applySongToSlides, type LyricStyle, type SongSectionData } from "./songFormatting";

type Slide = Record<string, any>;

const isChorusName = (name: string): boolean => /chorus/i.test(name) || /^c\d*(\s|\(|$)/i.test(name.trim());

/**
 * A slide for a section the song gained. It is modelled on a slide the song already has in this
 * item, so it looks the same (background, transitions ...) and follows the same naming. Its id
 * comes from the item and the section name, so every copy of the item gets the same id.
 */
const newSlideFor = (section: SongSectionData, template: Slide, itemId: string): Slide => {
  const { lyricStyle: _style, lyricHtml: _html, ...base } = template;
  // Slides added from the songbook are labelled with the whole section name ("V1 (Verse 1)"),
  // the others with its short tag ("V1")
  const wholeName = template.sectionLabel != null && template.sectionLabel === template.sectionName;
  const label = wholeName ? section.name : (section.name.split(/[\s(]/)[0] || section.name).toUpperCase();
  const base_title: string = String(template.title ?? "");
  const suffix = template.sectionLabel != null ? ` - ${template.sectionLabel}` : "";
  const title =
    suffix && base_title.endsWith(suffix)
      ? `${base_title.slice(0, base_title.length - suffix.length)} - ${label}`
      : base_title;

  return {
    ...base,
    id: `slide-${itemId}-sec-${encodeURIComponent(section.name)}`,
    type: isChorusName(section.name) ? "chorus" : "verse",
    title,
    content: section.content,
    sectionName: section.name,
    sectionLabel: label,
  };
};

/**
 * Brings the slides of one saved song in line with the song after it was edited: text and
 * formatting are updated (applySongToSlides), a slide is added for a section the song gained,
 * and the slide of a section that was deleted (or emptied) is removed. Slides of other songs and
 * other content are untouched, and when no section was added or removed the slides keep their
 * order (it may have been rearranged in the service); otherwise the song's slides follow the
 * song's own order, starting where its first slide was.
 */
export const syncSongSlides = (
  slides: Slide[],
  songId: string,
  sections: SongSectionData[],
  styles: Record<string, LyricStyle | undefined>,
  htmlFor: (name: string, content: string) => string | undefined,
  itemId: string,
): Slide[] => {
  const mine = slides.filter((slide) => slide?.songId === songId);
  if (mine.length === 0) return slides;

  // Slides from before section names were recorded can only be matched by order, which is
  // only safe while the song has as many sections as slides
  if (mine.every((slide) => slide.sectionName == null) && mine.length === sections.length) {
    return applySongToSlides(slides, songId, sections, styles, htmlFor);
  }

  const unused = new Set(mine);
  const matched: (Slide | undefined)[] = sections.map(() => undefined);
  sections.forEach((section, index) => {
    const slide = mine.find((candidate) => unused.has(candidate) && candidate.sectionName === section.name);
    if (slide) {
      matched[index] = slide;
      unused.delete(slide);
    }
  });
  // An older slide with no section name still belongs to a section whose text it shows
  sections.forEach((section, index) => {
    if (matched[index]) return;
    const slide = mine.find(
      (candidate) =>
        unused.has(candidate) &&
        candidate.sectionName == null &&
        String(candidate.content ?? "").trim() === section.content.trim(),
    );
    if (slide) {
      matched[index] = slide;
      unused.delete(slide);
    }
  });

  const structureUnchanged = unused.size === 0 && matched.every(Boolean);
  if (structureUnchanged) return applySongToSlides(slides, songId, sections, styles, htmlFor);

  const template = mine[0];
  const songSlides = sections.map(
    (section, index) => matched[index] ?? newSlideFor(section, template, itemId),
  );
  const patched = applySongToSlides(songSlides, songId, sections, styles, htmlFor);

  // The song's slides go where its first slide was; its other slides are replaced by them
  const result: Slide[] = [];
  let placed = false;
  for (const slide of slides) {
    if (slide?.songId !== songId) {
      result.push(slide);
    } else if (!placed) {
      result.push(...patched);
      placed = true;
    }
  }
  return result;
};
