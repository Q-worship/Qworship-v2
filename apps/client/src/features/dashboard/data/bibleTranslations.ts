export const BIBLE_TRANSLATIONS = [
  { code: "kjv", abbreviation: "KJV", displayName: "King James Version", voiceAliases: ["kjv", "king james", "king james version"] },
  { code: "nkjv", abbreviation: "NKJV", displayName: "New King James Version", voiceAliases: ["nkjv", "new king james", "new king james version"] },
  { code: "niv", abbreviation: "NIV", displayName: "New International Version", voiceAliases: ["niv", "new international", "new international version"] },
  { code: "esv", abbreviation: "ESV", displayName: "English Standard Version", voiceAliases: ["esv", "english standard", "english standard version"] },
  { code: "amp", abbreviation: "AMP", displayName: "Amplified Bible", voiceAliases: ["amp", "amplified", "amplified bible", "amplified version"] },
  { code: "msg", abbreviation: "MSG", displayName: "The Message", voiceAliases: ["msg", "message", "the message", "message bible"] },
  { code: "gn", abbreviation: "GN", displayName: "Good News Translation", voiceAliases: ["gn", "gnt", "good news", "good news bible", "good news translation"] },
  { code: "nlt", abbreviation: "NLT", displayName: "New Living Translation", voiceAliases: ["nlt", "new living", "new living translation"] },
  { code: "nrsv", abbreviation: "NRSV", displayName: "New Revised Standard Version", voiceAliases: ["nrsv", "new revised standard", "new revised standard version"] },
  { code: "asv", abbreviation: "ASV", displayName: "American Standard Version", voiceAliases: ["asv", "american standard", "american standard version"] },
  { code: "ylt", abbreviation: "YLT", displayName: "Young's Literal Translation", voiceAliases: ["ylt", "youngs literal", "young's literal", "youngs literal translation", "young's literal translation"] },
  { code: "web", abbreviation: "WEB", displayName: "World English Bible", voiceAliases: ["web", "world english", "world english bible"] },
  { code: "webster", abbreviation: "WEBSTER", displayName: "Webster Bible", voiceAliases: ["webster", "webster bible", "webster's bible"] },
] as const;

export type BibleVersionCode = typeof BIBLE_TRANSLATIONS[number]["code"];

export const DEFAULT_PINNED_BIBLE_VERSIONS: BibleVersionCode[] = [
  "kjv", "nkjv", "niv", "msg", "esv", "amp",
];

export const BIBLE_VERSION_KEYS = BIBLE_TRANSLATIONS.map(item => item.code) as BibleVersionCode[];

export const getBibleTranslation = (value: string) =>
  BIBLE_TRANSLATIONS.find(item =>
    item.code === value.toLowerCase() || item.abbreviation === value.toUpperCase(),
  );

export const normalizeBibleVersion = (value: string): BibleVersionCode | null =>
  getBibleTranslation(value)?.code || null;

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const voiceAliases = BIBLE_TRANSLATIONS
  .flatMap(translation => translation.voiceAliases.map(alias => ({ alias, code: translation.code })))
  .sort((left, right) => right.alias.length - left.alias.length);

/** Recognize explicit translation commands without waiting for a final transcript. */
export const parseBibleVersionCommand = (value: string): BibleVersionCode | null => {
  const normalized = value.toLowerCase().replace(/[.,!?;:]+/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  const hasCommandCue = /\b(?:show|switch|change|use|read|display|give|see|version|translation|bible)\b/i.test(normalized);

  let latestMatch: { code: BibleVersionCode; index: number } | null = null;
  for (const { alias, code } of voiceAliases) {
    const aliasPattern = new RegExp(`(?:^|\\b)${escapeRegex(alias)}(?:$|\\b)`, "i");
    const match = aliasPattern.exec(normalized);
    if (match && (hasCommandCue || normalized === alias)) {
      const aliasIndex = match.index + match[0].toLowerCase().lastIndexOf(alias.toLowerCase());
      if (!latestMatch || aliasIndex > latestMatch.index) latestMatch = { code, index: aliasIndex };
    }
  }
  return latestMatch?.code || null;
};
