export const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'i', 'me', 'my', 'we', 'our', 'you',
  'your', 'it', 'its', 'they', 'them', 'their', 'this', 'that', 'these',
  'those', 'am', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
  'from', 'as', 'into', 'about', 'what', 'how', 'when', 'where', 'why',
  'who', 'which', 'and', 'or', 'but', 'if', 'not', 'no', 'yes',
  'work', 'works',
])

export function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/\b(qworshi?p|qorship|qworsh)\b/g, 'qworship')
    .replace(/q[\s-]?worship/g, 'qworship')
    .replace(/\bsetup\b/g, 'set up')
    .replace(/\binstalls?\b/g, 'install')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function tokenize(text: string): string[] {
  const normalized = normalizeForMatch(text)
  const tokens = normalized
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word))

  if (/\bhow much\b/.test(normalized)) {
    tokens.push('cost')
  }

  return tokens
}
