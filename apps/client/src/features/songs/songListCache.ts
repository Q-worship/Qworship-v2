// Keeps the cached song list right after a save, without waiting for it to be fetched again,
// so a song that was just created or edited shows up (once, and as edited) straight away.

/** Replaces the song with the same id, or adds it when it is new. Never adds a second copy. */
export const upsertSongInList = <T extends { id: string }>(songs: T[], song: T): T[] => {
  const index = songs.findIndex((existing) => existing.id === song.id);
  if (index < 0) return [...songs, song];
  return songs.map((existing, i) => (i === index ? { ...existing, ...song } : existing));
};

export const removeSongFromList = <T extends { id: string }>(songs: T[], id: string): T[] =>
  songs.filter((song) => song.id !== id);
