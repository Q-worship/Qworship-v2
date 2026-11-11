/**
 * True for the id of a song that is actually saved (a database id). The songbook also shows a
 * built-in "Example Song" (id "example") when an account has no songs yet; it is not stored
 * anywhere, so it can't be updated or deleted on the server, only copied into a new song.
 */
export const isSavedSongId = (id: unknown): boolean => /^[a-f\d]{24}$/i.test(String(id ?? ""));
