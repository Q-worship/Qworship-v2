import { faqItems, pricingFaqTeaserItems } from './faqPool'
import type { FaqItem } from '../types/content'
import { normalizeForMatch, tokenize } from './faqMatchNormalize'
import { searchFaqByOverlap, searchFaqByPhrases, searchFaqByDiscriminativeTerms } from './faqSearchIndex'
import { resolveIntentFaq } from './faqQueryIntent'

const MATCH_CONFIG = {
  minSubstringLength: 12,
} as const

function findExactOrSubstringMatch(query: string, pool: FaqItem[]): FaqItem | null {
  const normalizedQuery = normalizeForMatch(query)
  if (!normalizedQuery) return null

  for (const faq of pool) {
    const normalizedQuestion = normalizeForMatch(faq.question)

    if (normalizedQuery === normalizedQuestion) {
      return faq
    }

    const shorter =
      normalizedQuery.length <= normalizedQuestion.length
        ? normalizedQuery
        : normalizedQuestion
    const longer =
      normalizedQuery.length > normalizedQuestion.length
        ? normalizedQuery
        : normalizedQuestion

    if (shorter.length >= MATCH_CONFIG.minSubstringLength && longer.includes(shorter)) {
      return faq
    }
  }

  return null
}

export function getChatbotFaqPool(): FaqItem[] {
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

export function matchFaqAnswer(query: string): FaqItem | null {
  const trimmed = query.trim()
  if (!trimmed) return null

  const pool = getChatbotFaqPool()

  const exactMatch = findExactOrSubstringMatch(trimmed, pool)
  if (exactMatch) return exactMatch

  const intentMatch = resolveIntentFaq(trimmed)
  if (intentMatch) return intentMatch

  const discriminativeMatch = searchFaqByDiscriminativeTerms(trimmed)
  if (discriminativeMatch) return discriminativeMatch

  const phraseMatch = searchFaqByPhrases(trimmed)
  if (phraseMatch) return phraseMatch

  const overlapMatch = searchFaqByOverlap(trimmed)
  if (overlapMatch) return overlapMatch

  const queryTokens = tokenize(trimmed)
  if (queryTokens.length === 1 && queryTokens[0] === 'qworship') {
    return pool.find((faq) => faq.id === 'what-is-qworship') ?? null
  }

  return null
}
