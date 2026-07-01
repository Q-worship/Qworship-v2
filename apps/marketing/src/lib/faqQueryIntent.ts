import type { FaqItem } from '../types/content'
import { faqItems, pricingFaqTeaserItems } from './faqPool'
import { normalizeForMatch } from './faqMatchNormalize'

function getFaqPool(): FaqItem[] {
  const seen = new Set<string>()
  const pool: FaqItem[] = []

  for (const item of [...faqItems, ...pricingFaqTeaserItems]) {
    if (!seen.has(item.id)) {
      seen.add(item.id)
      pool.push(item)
    }
  }

  return pool
}

export type QueryIntent =
  | 'offline'
  | 'features'
  | 'cost'
  | 'manage_plan'
  | 'yearly_billing'
  | null

const INTENT_FAQ_IDS: Record<Exclude<QueryIntent, null>, string[]> = {
  offline: ['offline-capability'],
  features: ['features-overview'],
  cost: ['how-much-cost'],
  manage_plan: ['cancel-anytime', 'pricing-switch-plans'],
  yearly_billing: ['yearly-billing', 'pricing-yearly-discount'],
}

export function detectQueryIntent(query: string): QueryIntent {
  const normalized = normalizeForMatch(query)
  if (!normalized) return null

  if (
    /\b(work offline|works offline|without internet|no (wifi|wi fi|internet)|offline mode)\b/.test(
      normalized,
    ) ||
    (/\boffline\b/.test(normalized) && /\b(work|works|use|run)\b/.test(normalized))
  ) {
    return 'offline'
  }

  if (
    /\b(features|capabilities|what can (it|qworship) do|what does (it|qworship) (do|include|offer))\b/.test(
      normalized,
    )
  ) {
    return 'features'
  }

  if (
    /\bhow much\b/.test(normalized) ||
    /\b(what does .* cost|how much does|afford)\b/.test(normalized) ||
    (/\b(cost|pricing|price)\b/.test(normalized) &&
      !/\b(yearly|annual|monthly|billing cycle|pay yearly|pay monthly)\b/.test(normalized) &&
      !/\b(handle|manage|change|cancel|switch|upgrade|downgrade)\b/.test(normalized))
  ) {
    return 'cost'
  }

  if (
    /\b(handle|manage)\b.*\b(pricing|plan|subscription|billing)\b/.test(normalized) ||
    /\b(change|cancel|switch|upgrade|downgrade)\b.*\b(plan|pricing|subscription)\b/.test(
      normalized,
    )
  ) {
    return 'manage_plan'
  }

  if (
    /\b(yearly|annual|monthly|billing cycle|pay yearly|pay monthly|yearly discount)\b/.test(
      normalized,
    )
  ) {
    return 'yearly_billing'
  }

  return null
}

export function resolveIntentFaq(query: string): FaqItem | null {
  const intent = detectQueryIntent(query)
  if (!intent) return null

  const pool = getFaqPool()
  const normalized = normalizeForMatch(query)

  if (intent === 'yearly_billing') {
    if (/\bdiscount\b/.test(normalized)) {
      return pool.find((item) => item.id === 'pricing-yearly-discount') ?? null
    }
    return pool.find((item) => item.id === 'yearly-billing') ?? null
  }

  const preferredIds = INTENT_FAQ_IDS[intent]

  for (const id of preferredIds) {
    const faq = pool.find((item) => item.id === id)
    if (faq) return faq
  }

  return null
}

export function rankFaqByIntent(intent: QueryIntent, faqId: string): number {
  if (!intent) return 0

  const preferred = INTENT_FAQ_IDS[intent]
  const index = preferred.indexOf(faqId)
  if (index >= 0) return preferred.length - index

  if (intent === 'cost' && (faqId === 'yearly-billing' || faqId === 'pricing-yearly-discount')) {
    return -2
  }

  if (intent === 'yearly_billing' && faqId === 'how-much-cost') {
    return -1
  }

  return 0
}
