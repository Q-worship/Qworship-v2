import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Song, ISong } from './song.model.js';
import { SongParser } from './songParser.js'; // The legacy parsing engine

// Songs belong to the account that created them: every query below is limited to
// the signed-in user's own songs, so nobody sees, edits or deletes anyone else's.
const mine = (req: any) => ({ createdBy: req.user._id });
const ownedById = (req: any) => ({ _id: req.params.id, ...mine(req) });

// Fields a client may change on an existing song (never createdBy / organizationId)
const EDITABLE_FIELDS = [
  'title', 'artist', 'album', 'lyrics', 'structure', 'key', 'tempo', 'ccliNumber',
  'tags', 'sections', 'sectionStyles', 'sectionHtml', 'alternativeTitles', 'authors', 'topics',
  'copyright', 'isActive',
] as const;

// ---- Lyric formatting ------------------------------------------------------------
// sectionStyles: base formatting per section; sectionHtml: inline formatting per section.
// Both are keyed by the section's name in the lyrics (e.g. "V1 (Verse 1)"). The screens
// that show the HTML sanitise it again, so this is a size / shape check, not the only guard.

const MAX_SECTIONS = 100;
const MAX_KEY_LENGTH = 200;
const MAX_HTML_LENGTH = 30000;

// MongoDB keys can't contain "." or start with "$", but section names can
const encodeKey = (key: string) => key.replace(/\./g, '．').replace(/^\$/, '＄');
const decodeKey = (key: string) => key.replace(/．/g, '.').replace(/^＄/, '$');

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const cleanStyle = (raw: unknown): Record<string, unknown> | undefined => {
  if (!isPlainObject(raw)) return undefined;
  const style: Record<string, unknown> = {};
  for (const flag of ['bold', 'italic', 'underline', 'strike'] as const) {
    if (raw[flag] === true) style[flag] = true;
  }
  if (typeof raw.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(raw.color)) style.color = raw.color;
  if (typeof raw.fontFamily === 'string' && /^[\w\s.-]{1,60}$/.test(raw.fontFamily)) style.fontFamily = raw.fontFamily;
  const within = (value: unknown, min: number, max: number) =>
    typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
  if (within(raw.fontSize, 10, 400)) style.fontSize = Math.round(raw.fontSize as number);
  if (within(raw.lineHeight, 0.5, 4)) style.lineHeight = raw.lineHeight;
  if (within(raw.letterSpacing, -0.2, 1)) style.letterSpacing = raw.letterSpacing;
  if (['left', 'center', 'right', 'justify'].includes(raw.align as string)) style.align = raw.align;
  if (['uppercase', 'lowercase', 'capitalize'].includes(raw.textTransform as string)) {
    style.textTransform = raw.textTransform;
  }
  return Object.keys(style).length > 0 ? style : undefined;
};

export const cleanSectionStyles = (value: unknown): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if (!isPlainObject(value)) return result;
  for (const [key, raw] of Object.entries(value).slice(0, MAX_SECTIONS)) {
    if (!key || key.length > MAX_KEY_LENGTH) continue;
    const style = cleanStyle(raw);
    if (style) result[encodeKey(key)] = style;
  }
  return result;
};

export const cleanSectionHtml = (value: unknown): Record<string, string> => {
  const result: Record<string, string> = {};
  if (!isPlainObject(value)) return result;
  for (const [key, raw] of Object.entries(value).slice(0, MAX_SECTIONS)) {
    if (!key || key.length > MAX_KEY_LENGTH) continue;
    if (typeof raw === 'string' && raw.length > 0 && raw.length <= MAX_HTML_LENGTH) {
      result[encodeKey(key)] = raw;
    }
  }
  return result;
};

const cleanAlternativeTitles = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((t): t is string => typeof t === 'string').map((t) => t.trim().slice(0, 200)).filter(Boolean).slice(0, 10)
    : [];

// ---- Authors, topics, copyright and verse order -----------------------------------
// The editor sends authors / topics as text ("A, B") and the verse order as a JSON string
// ('["V1","C1"]'); they are stored as lists. An older save stored the whole JSON string as a
// single list entry, so the same parsing also repairs those songs when they are read.

/** A list of short strings from an array, or from text split on commas / semicolons / lines. */
export const cleanStringList = (value: unknown, maxItems = 50, maxLength = 200): string[] => {
  const raw: unknown[] =
    typeof value === 'string' ? value.split(/[,;\n]/) : Array.isArray(value) ? value : [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'string') continue;
    const text = entry.trim().slice(0, maxLength);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    result.push(text);
    if (result.length >= maxItems) break;
  }
  return result;
};

export const cleanCopyright = (value: unknown): string =>
  typeof value === 'string' ? value.slice(0, 2000) : '';

/** The verse order as a list of tags, from a list, a JSON string of a list, or plain text. */
export const normalizeStructure = (value: unknown): string[] => {
  let candidate: unknown = value;
  // Unwrap the JSON text however it got wrapped: as a string, as the only entry of a list,
  // quoted again, or split on its commas into fragments like ["V1" and "C1"] (what reopening
  // and re-saving a song that was stored the old way produced)
  for (let pass = 0; pass < 4; pass++) {
    if (Array.isArray(candidate)) {
      const strings = candidate.filter((entry): entry is string => typeof entry === 'string');
      if (strings.length === 1) {
        candidate = strings[0];
        continue;
      }
      const joined = strings.join(',').trim();
      if (strings.length > 1 && joined.startsWith('[') && joined.endsWith(']')) {
        try {
          candidate = JSON.parse(joined);
          continue;
        } catch {
          // not JSON: a normal list
        }
      }
      break;
    }
    if (typeof candidate === 'string') {
      const text = candidate.trim();
      if (text.startsWith('[') || text.startsWith('"')) {
        try {
          candidate = JSON.parse(text);
          continue;
        } catch {
          // not JSON: plain text
        }
      }
    }
    break;
  }
  return cleanStringList(candidate, 200, 40);
};

const decodeKeys = (value: unknown): Record<string, unknown> =>
  isPlainObject(value)
    ? Object.fromEntries(Object.entries(value).map(([key, entry]) => [decodeKey(key), entry]))
    : {};

/** A song as the client receives it (formatting keys back to the real section names). */
const present = (song: any) => {
  const plain = song.toObject();
  return {
    ...plain,
    structure: normalizeStructure(plain.structure),
    id: song._id.toString(),
    sectionStyles: decodeKeys(plain.sectionStyles),
    sectionHtml: decodeKeys(plain.sectionHtml),
  };
};

const pickEditable = (body: any) => {
  const update: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (body && body[field] !== undefined) update[field] = body[field];
  }
  if ('sectionStyles' in update) update.sectionStyles = cleanSectionStyles(update.sectionStyles);
  if ('sectionHtml' in update) update.sectionHtml = cleanSectionHtml(update.sectionHtml);
  if ('alternativeTitles' in update) update.alternativeTitles = cleanAlternativeTitles(update.alternativeTitles);
  if ('authors' in update) update.authors = cleanStringList(update.authors);
  if ('topics' in update) update.topics = cleanStringList(update.topics);
  if ('copyright' in update) update.copyright = cleanCopyright(update.copyright);
  if ('structure' in update) update.structure = normalizeStructure(update.structure);
  return update;
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const getSongsRevision = async (req: any, res: Response) => {
  try {
    const [count, latest] = await Promise.all([
      Song.countDocuments(mine(req)),
      Song.findOne(mine(req), { updatedAt: 1 }).sort({ updatedAt: -1 }).lean(),
    ]);
    const latestUpdate = latest?.updatedAt ? new Date(latest.updatedAt).getTime() : 0;
    res.json({ success: true, fingerprint: `${count}:${latestUpdate}`, count });
  } catch (error) {
    console.error("Songs revision error:", error);
    res.status(500).json({ success: false, error: "Failed to inspect song library" });
  }
};

// Get the signed-in user's songs
export const getSongs = async (req: any, res: Response) => {
  try {
    const songs = await Song.find(mine(req)).sort({ title: 1 });

    // Convert structure to frontend format natively
    const formattedSongs = songs.map((s) => {
      const shaped = present(s);
      return {
        ...shaped,
        verseOrder: shaped.structure.length > 0 ? shaped.structure.join(", ") : undefined,
      };
    });

    res.json({ success: true, songs: formattedSongs });
  } catch (error) {
    console.error("Songs fetch error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch songs" });
  }
};

// Get single song logic
export const getSongById = async (req: any, res: Response) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, error: "Song not found" });
    }
    const song = await Song.findOne(ownedById(req));
    if (!song) return res.status(404).json({ success: false, error: "Song not found" });

    res.json({ success: true, song: present(song) });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch song" });
  }
};

// Create a new song into MongoDB
export const createSong = async (req: any, res: Response) => {
  try {
    const { title, artist, album, lyrics, structure, key, tempo, tags, sections, sectionStyles, sectionHtml, alternativeTitles, authors, topics, copyright, ccliNumber } = req.body;

    // We map frontend 'sections' into our embedded schema format
    const newSong = await Song.create({
      title,
      artist: artist || '',
      album: album || '',
      lyrics,
      structure: normalizeStructure(structure),
      sections: Array.isArray(sections) ? sections : [],
      sectionStyles: cleanSectionStyles(sectionStyles),
      sectionHtml: cleanSectionHtml(sectionHtml),
      alternativeTitles: cleanAlternativeTitles(alternativeTitles),
      key: key || '',
      tempo: tempo || 120,
      tags: tags || [],
      authors: cleanStringList(authors),
      topics: cleanStringList(topics),
      copyright: cleanCopyright(copyright),
      ccliNumber: ccliNumber || '',
      createdBy: req.user._id,
      organizationId: req.user._id, // Assuming personal library namespace for now
    });

    res.json({ success: true, song: present(newSong) });
  } catch (error: any) {
    console.error("Song creation error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateSong = async (req: any, res: Response) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, error: "Not found" });
    }
    const updated = await Song.findOneAndUpdate(ownedById(req), pickEditable(req.body), { new: true });
    if (!updated) return res.status(404).json({ success: false, error: "Not found" });

    res.json({ success: true, song: present(updated) });
  } catch (error) {
    res.status(500).json({ success: false, error: "Update failed" });
  }
};

export const deleteSong = async (req: any, res: Response) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, error: "Not found" });
    }
    const deleted = await Song.findOneAndDelete(ownedById(req));
    if (!deleted) return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, message: "Song deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Deletion failed" });
  }
};

export const getSongForProjection = async (req: any, res: Response) => {
  try {
    const { songId } = req.body;
    if (!mongoose.isValidObjectId(songId)) {
      return res.status(404).json({ success: false, error: "Song not found" });
    }
    const song = await Song.findOne({ _id: songId, ...mine(req) });
    if (!song) return res.status(404).json({ success: false, error: "Song not found" });

    res.json({ success: true, song: present(song) });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch for projection" });
  }
};

export const searchSongs = async (req: any, res: Response) => {
  try {
    const { query } = req.body;
    const regex = new RegExp(escapeRegex(String(query ?? '')), 'i');
    const songs = await Song.find({
      ...mine(req),
      $or: [{ title: regex }, { artist: regex }, { lyrics: regex }]
    });

    res.json({
      success: true,
      songs: songs.map((s) => present(s))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Search failed" });
  }
};

// Legacy Bulk Importer Handler
export const importSong = async (req: any, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: "No file uploaded" });

    const { buffer } = req.file;
    const { format } = req.body;

    let parsedSong;
    if (format === "TEXT") {
      parsedSong = SongParser.parseTextFile(buffer.toString("utf-8"));
    } else if (format === "DOCX") {
      parsedSong = await SongParser.parseDOCXFile(buffer);
    } else if (format === "PDF") {
      parsedSong = await SongParser.parsePDFFile(buffer);
    }

    if (!parsedSong) return res.status(400).json({ success: false, error: "Failed to parse song" });

    // Reconstruct legacy song data into precise Mongoose bindings
    const newSong = await Song.create({
      title: parsedSong.title,
      artist: parsedSong.artist || "",
      lyrics: parsedSong.lyrics,
      structure: parsedSong.structure || [],
      // The importer leaves sections blank initially until edited on the dashboard
      sections: [],
      organizationId: req.user._id,
      createdBy: req.user._id,
    });

    res.json({ success: true, song: present(newSong) });
  } catch (error: any) {
    console.error("Import error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
