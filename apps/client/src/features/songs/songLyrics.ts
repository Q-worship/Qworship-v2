// A song's lyrics are saved as text with a "[section name]" line before each section:
//
//   [V1 (Verse 1)]
//   first line
//   second line
//
//   [C1 (Chorus 1)]
//   ...
//
// This reads that text back into sections for the Song editor.

export interface ParsedLyricSection {
  id: string;
  type: "verse" | "chorus";
  number: number;
  label: string;
  content: string;
}

/** A section's lines with the blank lines around them removed (blank lines inside are kept). */
const sectionText = (content: string[]): string => {
  let start = 0;
  let end = content.length;
  while (start < end && content[start] === "") start++;
  while (end > start && content[end - 1] === "") end--;
  return content.slice(start, end).join("\n");
};

/**
 * Reads saved lyrics into editor sections. Blank lines inside a section are the writer's own
 * spacing and are kept, and so are sections that have no words yet, so what was saved is what
 * comes back. Lyrics with no [section] headers at all are kept as a single verse.
 */
export const parseLyricsForEditor = (lyrics: string): ParsedLyricSection[] => {
  const sections: ParsedLyricSection[] = [];
  const lines = lyrics.split("\n");
  let current: { type: "verse" | "chorus"; label: string; content: string[] } | null = null;
  let verseCount = 0;
  let chorusCount = 0;
  const stamp = Date.now();

  const finish = () => {
    if (!current) return;
    const isChorus = current.type === "chorus";
    sections.push({
      id: `${current.type[0]}${isChorus ? chorusCount : verseCount}_${stamp}_${sections.length}`,
      type: current.type,
      number: isChorus ? chorusCount : verseCount,
      label: current.label,
      content: sectionText(current.content),
    });
  };

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("[") && trimmedLine.endsWith("]")) {
      finish();
      const label = trimmedLine.slice(1, -1);
      const isChorus = label.toLowerCase().includes("chorus");
      if (isChorus) chorusCount++;
      else verseCount++;
      current = { type: isChorus ? "chorus" : "verse", label, content: [] };
    } else if (current) {
      current.content.push(trimmedLine);
    }
  }
  finish();

  if (sections.length === 0 && lyrics.trim()) {
    sections.push({
      id: `v1_${stamp}_0`,
      type: "verse",
      number: 1,
      label: "V1 (Verse 1)",
      content: lyrics.trim(),
    });
  }

  return sections;
};
