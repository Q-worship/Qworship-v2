// When a song was last edited, shown the way people read it: "Just now", "5 min ago",
// "Today, 3:42 PM", "Yesterday, 3:42 PM", "Mon, 3:42 PM", "Nov 6".

const MINUTE = 60_000;
const SAME_SAVE_MS = 2_000;

const timeOfDay = (date: Date) =>
  date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const toTime = (value: string | number | Date | undefined | null): number | null => {
  if (value === undefined || value === null || value === "") return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
};

/** True when the song has been saved again since it was created. */
export const wasEdited = (
  createdAt: string | undefined | null,
  updatedAt: string | undefined | null,
): boolean => {
  const created = toTime(createdAt);
  const updated = toTime(updatedAt);
  return created !== null && updated !== null && updated - created > SAME_SAVE_MS;
};

/** A moment relative to `now`, e.g. "5 min ago" or "Yesterday, 3:42 PM". */
export const formatRelativeTime = (
  value: string | number | Date | undefined | null,
  now: number,
): string => {
  const time = toTime(value);
  if (time === null) return "";

  const diff = now - time;
  if (diff < MINUTE) return "Just now"; // also covers a clock a little ahead of the server
  if (diff < 60 * MINUTE) return `${Math.floor(diff / MINUTE)} min ago`;

  const date = new Date(time);
  const daysAgo = Math.round((startOfDay(new Date(now)) - startOfDay(date)) / 86_400_000);
  if (daysAgo <= 0) return `Today, ${timeOfDay(date)}`;
  if (daysAgo === 1) return `Yesterday, ${timeOfDay(date)}`;
  if (daysAgo < 7) {
    return `${date.toLocaleDateString("en-US", { weekday: "short" })}, ${timeOfDay(date)}`;
  }
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
};

/** The exact date and time, for a tooltip. */
export const formatExactTime = (value: string | number | Date | undefined | null): string => {
  const time = toTime(value);
  if (time === null) return "";
  return new Date(time).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

/**
 * "Edited 5 min ago" for a song that has been saved again since it was created,
 * "Added Yesterday, 3:42 PM" for one that has not been edited yet.
 */
export const describeSongTime = (
  song: { createdAt?: string; updatedAt?: string },
  now: number,
): string => {
  const edited = wasEdited(song.createdAt, song.updatedAt);
  const when = formatRelativeTime(edited ? song.updatedAt : (song.createdAt ?? song.updatedAt), now);
  if (!when) return "";
  return `${edited ? "Edited" : "Added"} ${when}`;
};
