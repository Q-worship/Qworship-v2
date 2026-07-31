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
  { code: "webster", abbreviation: "WEBSTER", displayName: "Webster Bible", voiceAliases: ["webster", "webster bible", "websters bible"] },
] as const;

export type BibleVersionCode = typeof BIBLE_TRANSLATIONS[number]["code"];

export const BIBLE_VERSION_KEYS = BIBLE_TRANSLATIONS.map(item => item.code) as BibleVersionCode[];
export const DEFAULT_PINNED_BIBLE_VERSIONS: BibleVersionCode[] = [
  "kjv", "nkjv", "niv", "msg", "esv", "amp",
];
export const BUNDLED_BIBLE_VERSION_KEYS: BibleVersionCode[] = [
  "kjv", "nkjv", "amp", "msg", "esv", "niv",
];

export const isBibleVersionCode = (value: unknown): value is BibleVersionCode =>
  typeof value === "string" && BIBLE_VERSION_KEYS.includes(value.toLowerCase() as BibleVersionCode);

export const getBibleTranslation = (value: string) =>
  BIBLE_TRANSLATIONS.find(item => item.code === value.toLowerCase());

export const BIBLE_VERSION_ALIASES: Record<string, BibleVersionCode> =
  Object.fromEntries(
    BIBLE_TRANSLATIONS.flatMap(item =>
      item.voiceAliases.map(alias => [alias.toLowerCase(), item.code]),
    ),
  ) as Record<string, BibleVersionCode>;

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const BIBLE_VERSION_ALIAS_PATTERN = Object.keys(BIBLE_VERSION_ALIASES)
  .sort((left, right) => right.length - left.length)
  .map(escapeRegex)
  .join("|");
