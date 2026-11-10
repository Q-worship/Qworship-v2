// The Build screen's "Edit & Preparation" panel edits a song that is in the service.
//
// A song gets into the service in two shapes: from the songbook it is an item with the song's
// sections on the item itself (`content` is the list of sections, `songId`, `lyrics`,
// `sectionStyles` and `sectionHtml` sit next to it), and from a search it is an item whose
// `content` is the song. These helpers read either shape the same way, keep the item up to
// date when the song is saved again, and decide which section cards the panel shows.

import { parseLyricsForEditor } from "./songLyrics";

type Item = Record<string, any>;

const isPlainObject = (value: unknown): value is Record<string, any> =>
  !!value && typeof value === "object" && !Array.isArray(value);

/** The saved song an item is for (songbook items carry it as `songId`, searched ones in `content`). */
export const songIdOfItem = (item: Item | null | undefined): string | undefined => {
  if (!item) return undefined;
  if (item.songId) return String(item.songId);
  if (isPlainObject(item.content) && item.content.id) return String(item.content.id);
  return undefined;
};

/** True when this item is the song with that id. */
export const isItemOfSong = (item: Item | null | undefined, songId: string | undefined): boolean =>
  !!songId && songIdOfItem(item) === songId;

/** Sections as "[name]" blocks, the way a song's lyrics are saved. */
export const joinSectionsAsLyrics = (sections: Record<string, string>): string =>
  Object.entries(sections)
    .map(([name, text]) => `[${name}]\n${text}`)
    .join("\n\n");

/** The lyrics of a song item, whichever shape it has ("" when it has none). */
export const lyricsOfItem = (item: Item | null | undefined): string => {
  if (!item) return "";
  const content = item.content;
  if (isPlainObject(content) && typeof content.lyrics === "string" && content.lyrics.trim()) {
    return content.lyrics;
  }
  if (typeof item.lyrics === "string" && item.lyrics.trim()) return item.lyrics;

  const sections: any[] = Array.isArray(item.sections)
    ? item.sections
    : Array.isArray(content)
      ? content
      : [];
  return sections
    .filter((section) => section && String(section.content ?? section.text ?? "").trim())
    .map(
      (section) =>
        `[${section.label ?? section.type ?? "Section"}]\n${section.content ?? section.text}`,
    )
    .join("\n\n");
};

/**
 * A song item as one song object: id, title, lyrics and the formatting saved with it. This is
 * what the panel edits, so an edit keeps the song's id (its slides stay linked to it) and its
 * formatting. Null for an item that is not a song or has no words.
 */
export const songOfItem = (item: Item | null | undefined): Record<string, any> | null => {
  if (!item || item.type !== "song") return null;
  const lyrics = lyricsOfItem(item);
  if (!lyrics.trim()) return null;

  const base: Record<string, any> = isPlainObject(item.content) ? item.content : {};
  const pick = (key: string) => base[key] ?? item[key];
  return {
    ...base,
    id: base.id ?? item.songId ?? item.id,
    title: base.title ?? item.title,
    lyrics,
    sectionStyles: pick("sectionStyles"),
    sectionHtml: pick("sectionHtml"),
    verseOrder: pick("verseOrder"),
    structure: pick("structure"),
    artist: pick("artist"),
  };
};

/**
 * An item after its song was saved again: the new words and formatting, in whichever shape the
 * item has. The item's own title follows the song's new title only when it was still showing the
 * old one (a title typed for the screen is left alone). Items of other songs come back as they
 * were.
 */
export const refreshItemFromSavedSong = (
  item: Item,
  saved: Record<string, any>,
  previousTitle?: string,
): Item => {
  if (!saved?.id || !isItemOfSong(item, String(saved.id))) return item;

  const lyrics: string = typeof saved.lyrics === "string" ? saved.lyrics : lyricsOfItem(item);
  const sections = parseLyricsForEditor(lyrics).filter((section) => section.content.trim());
  const title =
    previousTitle != null && item.title === previousTitle && saved.title ? saved.title : item.title;
  const verseOrder =
    Array.isArray(saved.structure) && saved.structure.length > 0
      ? saved.structure.join(", ")
      : saved.verseOrder;
  const formatting = {
    sectionStyles: saved.sectionStyles ?? {},
    sectionHtml: saved.sectionHtml ?? {},
  };

  if (isPlainObject(item.content)) {
    return {
      ...item,
      title,
      content: { ...item.content, ...saved, lyrics, ...formatting, verseOrder },
    };
  }
  return {
    ...item,
    title,
    content: sections,
    sections,
    lyrics,
    verseOrder,
    ...formatting,
    ...(saved.structure !== undefined ? { structure: saved.structure } : {}),
  };
};

const WORD_FOR_LETTER: Record<string, string> = {
  v: "verse",
  c: "chorus",
  b: "bridge",
  p: "pre-chorus",
};

/** Does the arrangement entry ("V1", "C", "Verse 2" or a full section name) mean this section? */
const matchesArrangement = (sectionName: string, entry: string): boolean => {
  const name = sectionName.toLowerCase().trim();
  const wanted = entry.toLowerCase().trim();
  if (!wanted) return false;
  if (name === wanted) return true;
  // "v1" as a word of "v1 (verse 1)" (but not inside "v10 (verse 10)")
  if (
    wanted.length > 1 &&
    new RegExp(`(^|[^a-z0-9])${wanted.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(name)
  ) {
    return true;
  }
  // "c" or "v": any section of that kind
  if (/^[a-z]$/.test(wanted)) {
    const word = WORD_FOR_LETTER[wanted];
    return new RegExp(`^${wanted}\\d*(\\s|\\(|$)`).test(name) || (!!word && name.includes(word));
  }
  // "v2": the section called "verse 2"
  const tagged = /^([a-z])(\d+)$/.exec(wanted);
  if (tagged && WORD_FOR_LETTER[tagged[1]]) {
    return new RegExp(`${WORD_FOR_LETTER[tagged[1]]} ${tagged[2]}(?!\\d)`).test(name);
  }
  return false;
};

/**
 * The sections the panel shows a card for, in order: those named by the song arrangement first
 * (each section once, even when the arrangement repeats it), then every other section of the
 * song, so nothing that was saved is ever hidden.
 */
export const orderedSectionCards = (
  arrangement: string[],
  sections: Record<string, string>,
): [string, string][] => {
  const names = Object.keys(sections);
  const shown: string[] = [];
  const show = (name: string | undefined) => {
    if (name !== undefined && !shown.includes(name)) shown.push(name);
  };

  for (const entry of arrangement) {
    const exact = names.find((name) => name === entry && !shown.includes(name));
    show(exact ?? names.find((name) => !shown.includes(name) && matchesArrangement(name, entry)));
  }
  names.forEach(show);

  return shown.map((name) => [name, sections[name]] as [string, string]);
};

/** The heading of a section's card: "V1 (Verse 1)" reads "Verse 1". */
export const sectionCardLabel = (sectionName: string): string => {
  const inBrackets = /\(([^)]+)\)\s*$/.exec(sectionName);
  return (inBrackets ? inBrackets[1] : sectionName).trim();
};
