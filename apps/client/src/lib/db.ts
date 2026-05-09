import Dexie, { type EntityTable } from "dexie";

export interface BibleVerse {
  id?: number;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  version: string;
}

export interface SyncState {
  version: string;
  syncedAt: number;
  status: "downloading" | "synced" | "error";
  totalVerses?: number;
}

const db = new Dexie("QworshipLocalDB") as Dexie & {
  verses: EntityTable<BibleVerse, "id">;
  syncState: EntityTable<SyncState, "version">;
  songs: EntityTable<any, "id">;
};

// Schema declaration:
// [version+book+chapter] index allows for blazing fast full-chapter fetching
// [version+book+chapter+verse] index allows immediate single verse lookup
db.version(3).stores({
  verses:
    "++id, version, book, chapter, [version+book], [version+book+chapter], [version+book+chapter+verse]",
  syncState: "version",
  songs: "++id, songId, title, [title+lyrics]",
});

// QC65: AMP and MSG data was completely empty before this fix. Bump to v4
// to purge all stale AMP and MSG verses from IndexedDB so they are
// re-fetched from the server (which now has the correct data).
db.version(4).stores({
  verses:
    "++id, version, book, chapter, [version+book], [version+book+chapter], [version+book+chapter+verse]",
  syncState: "version",
  songs: "++id, songId, title, [title+lyrics]",
}).upgrade(async (tx) => {
  // Delete all AMP and MSG verses — they were cached as empty strings
  // before QC65 populated the server data. All other versions are unaffected.
  await tx.table("verses").where("version").anyOf(["amp", "msg"]).delete();
  console.log("[DB Migration v4] Cleared stale AMP and MSG verse cache.");
});

export { db };
