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
  'tags', 'sections', 'sectionStyles', 'alternativeTitles', 'authors', 'topics', 'isActive',
] as const;

const pickEditable = (body: any) => {
  const update: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (body && body[field] !== undefined) update[field] = body[field];
  }
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
    const formattedSongs = songs.map((s) => ({
      ...s.toObject(),
      id: s._id.toString(),
      verseOrder: s.structure && s.structure.length > 0 ? s.structure.join(", ") : undefined,
    }));

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

    res.json({ success: true, song: { ...song.toObject(), id: song._id.toString() } });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch song" });
  }
};

// Create a new song into MongoDB
export const createSong = async (req: any, res: Response) => {
  try {
    const { title, artist, album, lyrics, structure, key, tempo, tags, sections, sectionStyles, alternativeTitles, authors, topics, ccliNumber } = req.body;

    // We map frontend 'sections' into our embedded schema format
    const newSong = await Song.create({
      title,
      artist: artist || '',
      album: album || '',
      lyrics,
      structure: Array.isArray(structure) ? structure : [],
      sections: Array.isArray(sections) ? sections : [],
      sectionStyles: sectionStyles && typeof sectionStyles === 'object' ? sectionStyles : {},
      alternativeTitles: Array.isArray(alternativeTitles) ? alternativeTitles : [],
      key: key || '',
      tempo: tempo || 120,
      tags: tags || [],
      authors: authors || [],
      topics: topics || [],
      ccliNumber: ccliNumber || '',
      createdBy: req.user._id,
      organizationId: req.user._id, // Assuming personal library namespace for now
    });

    res.json({ success: true, song: { ...newSong.toObject(), id: newSong._id.toString() } });
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

    res.json({ success: true, song: { ...updated.toObject(), id: updated._id.toString() } });
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

    res.json({ success: true, song: { ...song.toObject(), id: song._id.toString() } });
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
      songs: songs.map(s => ({ ...s.toObject(), id: s._id.toString() }))
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

    res.json({ success: true, song: { ...newSong.toObject(), id: newSong._id.toString() } });
  } catch (error: any) {
    console.error("Import error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
