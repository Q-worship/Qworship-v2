const SYNONYM_GROUPS: string[][] = [
  ['wifi', 'internet', 'offline', 'online', 'connection'],
  ['mac', 'windows', 'pc', 'operating', 'systems', 'download', 'platform'],
  ['trial', 'try', 'free'],
  ['price', 'cost', 'pricing', 'much', 'afford'],
  ['plan', 'plans', 'tier', 'subscription'],
  ['bible', 'scripture', 'hands', 'voice', 'verse'],
  ['install', 'set', 'up', 'setup', 'minutes'],
  ['cancel', 'change', 'switch', 'upgrade', 'downgrade', 'handle', 'manage'],
  ['media', 'image', 'video', 'import', 'library', 'upload'],
  ['lower', 'third', 'thirds', 'overlay', 'title'],
  ['slide', 'slides', 'canvas', 'presentation', 'projection'],
  ['cloud', 'local', 'desktop', 'browser'],
  ['yearly', 'annual', 'monthly', 'discount', 'billing'],
  ['unsplash', 'pexels', 'stock', 'photos'],
  ['obs', 'propresenter', 'integration', 'integrations'],
  ['user', 'users', 'account', 'team', 'seat'],
  ['features', 'capabilities', 'include', 'offer'],
]

export function expandQueryTokens(tokens: string[]): string[] {
  const expanded = new Set(tokens)

  for (const token of tokens) {
    for (const group of SYNONYM_GROUPS) {
      if (group.includes(token)) {
        for (const synonym of group) {
          expanded.add(synonym)
        }
      }
    }
  }

  return [...expanded]
}
