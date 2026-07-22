import { faqItems, pricingFaqTeaserItems } from './faqPool'
import type { FaqItem } from '../types/content'
import { normalizeForMatch, tokenize } from './faqMatchNormalize'
import { expandQueryTokens } from './faqSynonyms'
import { detectQueryIntent, rankFaqByIntent } from './faqQueryIntent'

const MIN_OVERLAP_SCORE = 8
const SCORE_MARGIN = 1.25
const PHRASE_MIN_LENGTH = 12
const PHRASE_HIT_SCORE = 24
const INTENT_BOOST = 12
const INTENT_PENALTY = 8

const QUESTION_TOKEN_WEIGHT = 3
const ANSWER_TOKEN_WEIGHT = 1
const ID_TOKEN_WEIGHT = 2

interface IndexedFaq {
  faq: FaqItem
  weightedTerms: Map<string, number>
  phrases: string[]
}

interface SearchIndex {
  entries: IndexedFaq[]
  docFreq: Map<string, number>
  poolSize: number
}

let cachedIndex: SearchIndex | null = null

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

function extractPhrases(question: string): string[] {
  const tokens = tokenize(question)
  const phrases: string[] = []

  for (let size = 2; size <= 3; size += 1) {
    for (let i = 0; i <= tokens.length - size; i += 1) {
      phrases.push(tokens.slice(i, i + size).join(' '))
    }
  }

  return phrases
}

function buildSearchIndex(): SearchIndex {
  const pool = getFaqPool()
  const docFreq = new Map<string, number>()
  const entries: IndexedFaq[] = []

  for (const faq of pool) {
    const weightedTerms = new Map<string, number>()

    const addTerm = (term: string, weight: number) => {
      weightedTerms.set(term, Math.max(weightedTerms.get(term) ?? 0, weight))
    }

    for (const token of tokenize(faq.question)) {
      addTerm(token, QUESTION_TOKEN_WEIGHT)
    }
    for (const token of tokenize(faq.answer)) {
      addTerm(token, ANSWER_TOKEN_WEIGHT)
    }
    for (const token of faq.id.split('-').filter((part) => part.length > 1)) {
      addTerm(token, ID_TOKEN_WEIGHT)
    }

    for (const term of weightedTerms.keys()) {
      docFreq.set(term, (docFreq.get(term) ?? 0) + 1)
    }

    entries.push({
      faq,
      weightedTerms,
      phrases: extractPhrases(faq.question),
    })
  }

  return { entries, docFreq, poolSize: pool.length }
}

function getSearchIndex(): SearchIndex {
  if (!cachedIndex) {
    cachedIndex = buildSearchIndex()
  }
  return cachedIndex
}

function idf(term: string, docFreq: Map<string, number>, poolSize: number): number {
  const df = docFreq.get(term) ?? 0
  return Math.log((poolSize + 1) / (df + 1)) + 1
}

function computeOverlapScore(
  query: string,
  entry: IndexedFaq,
  docFreq: Map<string, number>,
  poolSize: number,
): number {
  const queryTokens = expandQueryTokens(tokenize(query))
  let score = 0

  for (const token of queryTokens) {
    const weight = entry.weightedTerms.get(token)
    if (weight) {
      score += weight * idf(token, docFreq, poolSize)
    }
  }

  return score
}

function applyIntentAdjustment(query: string, faqId: string, score: number): number {
  const intent = detectQueryIntent(query)
  if (!intent) return score

  const rank = rankFaqByIntent(intent, faqId)
  if (rank > 0) return score + rank * INTENT_BOOST
  if (rank < 0) return score + rank * INTENT_PENALTY
  return score
}

function breakTieByIntent(
  query: string,
  candidates: { faq: FaqItem; score: number }[],
): FaqItem | null {
  const intent = detectQueryIntent(query)
  if (!intent) return null

  const ranked = [...candidates].sort(
    (a, b) => rankFaqByIntent(intent, b.faq.id) - rankFaqByIntent(intent, a.faq.id),
  )

  const bestRank = rankFaqByIntent(intent, ranked[0].faq.id)
  const secondRank = ranked[1] ? rankFaqByIntent(intent, ranked[1].faq.id) : Number.NEGATIVE_INFINITY

  if (bestRank > 0 && bestRank > secondRank) {
    return ranked[0].faq
  }

  return null
}

export function searchFaqByDiscriminativeTerms(query: string): FaqItem | null {
  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) return null

  const { entries, docFreq } = getSearchIndex()
  let winner: FaqItem | null = null

  for (const token of queryTokens) {
    if ((docFreq.get(token) ?? 0) !== 1) continue

    for (const entry of entries) {
      const weight = entry.weightedTerms.get(token)
      if (!weight) continue

      const fromQuestionOrId = weight >= ID_TOKEN_WEIGHT
      const fromDistinctiveAnswer =
        weight === ANSWER_TOKEN_WEIGHT && token.length >= 8

      if (!fromQuestionOrId && !fromDistinctiveAnswer) continue

      if (winner && winner.id !== entry.faq.id) {
        return null
      }
      winner = entry.faq
    }
  }

  return winner
}

function pickConfidentWinner(
  scores: { faq: FaqItem; score: number }[],
  query?: string,
): FaqItem | null {
  if (scores.length === 0) return null

  scores.sort((a, b) => b.score - a.score)

  const best = scores[0]
  const second = scores[1]

  if (best.score < MIN_OVERLAP_SCORE) return null

  if (second && second.score * SCORE_MARGIN >= best.score) {
    if (query) {
      const intentWinner = breakTieByIntent(query, scores.slice(0, 5))
      if (intentWinner) return intentWinner

      const { entries, docFreq, poolSize } = getSearchIndex()
      const tied = scores.filter((hit) => hit.score === best.score)
      const overlapRanked = tied
        .map((hit) => {
          const entry = entries.find((e) => e.faq.id === hit.faq.id)
          return {
            faq: hit.faq,
            score: entry
              ? computeOverlapScore(query, entry, docFreq, poolSize)
              : 0,
          }
        })
        .sort((a, b) => b.score - a.score)

      const overlapBest = overlapRanked[0]
      const overlapSecond = overlapRanked[1]

      if (
        overlapBest &&
        (!overlapSecond ||
          overlapSecond.score * SCORE_MARGIN < overlapBest.score)
      ) {
        return overlapBest.faq
      }

      const intentTieWinner = breakTieByIntent(query, tied)
      if (intentTieWinner) return intentTieWinner

      const tiedIds = new Set(tied.map((hit) => hit.faq.id))
      for (const faq of getFaqPool()) {
        if (tiedIds.has(faq.id)) {
          return faq
        }
      }
    }

    return null
  }

  return best.faq
}

export function searchFaqByPhrases(query: string): FaqItem | null {
  const normalizedQuery = normalizeForMatch(query)
  if (!normalizedQuery) return null

  const { entries } = getSearchIndex()
  const hits: { faq: FaqItem; score: number }[] = []

  for (const entry of entries) {
    for (const phrase of entry.phrases) {
      if (phrase.length >= PHRASE_MIN_LENGTH && normalizedQuery.includes(phrase)) {
        hits.push({ faq: entry.faq, score: phrase.length + PHRASE_HIT_SCORE })
      }
    }
  }

  return pickConfidentWinner(hits, query)
}

export function searchFaqByOverlap(query: string): FaqItem | null {
  const queryTokens = expandQueryTokens(tokenize(query))
  if (queryTokens.length === 0) return null

  const { entries, docFreq, poolSize } = getSearchIndex()
  const normalizedQuery = normalizeForMatch(query)
  const scores: { faq: FaqItem; score: number }[] = []

  for (const entry of entries) {
    let score = 0

    for (const token of queryTokens) {
      const weight = entry.weightedTerms.get(token)
      if (weight) {
        score += weight * idf(token, docFreq, poolSize)
      }
    }

    for (let i = 0; i < queryTokens.length - 1; i += 1) {
      const bigram = `${queryTokens[i]} ${queryTokens[i + 1]}`
      if (normalizedQuery.includes(bigram)) {
        const w1 = entry.weightedTerms.get(queryTokens[i])
        const w2 = entry.weightedTerms.get(queryTokens[i + 1])
        if (w1 && w2) {
          score += 4
        }
      }
    }

    if (score > 0) {
      score = applyIntentAdjustment(query, entry.faq.id, score)
      scores.push({ faq: entry.faq, score })
    }
  }

  return pickConfidentWinner(scores, query)
}
