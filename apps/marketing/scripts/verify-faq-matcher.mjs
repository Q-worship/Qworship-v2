#!/usr/bin/env node
/**
 * Paraphrase regression tests for matchFaqAnswer().
 * Usage: node scripts/verify-faq-matcher.mjs
 */
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const cases = [
  { query: 'How long does it take to set up?', faqId: 'setup-time' },
  { query: 'how long to install and setup qworship', faqId: 'setup-time' },
  { query: 'how long does it take to install and setup qworship', faqId: 'setup-time' },
  { query: 'do you have a free trial', faqId: 'pricing-free-trial' },
  { query: 'what is qworshp', faqId: 'what-is-qworship' },
  { query: 'What is Q-worship?', faqId: 'what-is-qworship' },
  { query: 'how do lower thirds work', faqId: 'lower-third-live' },
  { query: 'Is there a yearly discount', faqId: 'pricing-yearly-discount' },
  { query: 'can I use bible without wifi', faqId: ['no-wifi', 'hands-free-offline'] },
  { query: 'What if my church has no internet at all?', faqId: 'no-wifi' },
  { query: 'Is there a free plan?', faqId: 'free-plan' },
  { query: 'What operating systems does Q-worship support?', faqId: 'operating-systems' },
  { query: 'does it work on mac and windows', faqId: 'operating-systems' },
  { query: 'Can I cancel or change my plan?', faqId: 'cancel-anytime' },
  { query: 'Can I switch plans at any time?', faqId: 'pricing-switch-plans' },
  { query: 'hands free bible offline', faqId: 'hands-free-offline' },
  { query: 'unsplash photos in media library', faqId: 'unsplash-pexels' },
  { query: 'How many users can be on one account?', faqId: 'users-per-account' },
  { query: 'cloud based or installed locally', faqId: 'cloud-or-local' },
  { query: 'what payment methods do you accept', faqId: 'pricing-payment-methods' },
  { query: 'does Qworship work offline', faqId: 'offline-capability' },
  { query: 'what are the features?', faqId: 'features-overview' },
  { query: 'how much does Qworship cost?', faqId: 'how-much-cost' },
  {
    query: 'how can i handle the pricing',
    faqId: ['cancel-anytime', 'pricing-switch-plans', 'how-much-cost'],
  },
]

const server = await createServer({
  root,
  server: { middlewareMode: true },
  logLevel: 'error',
})

try {
  const { matchFaqAnswer, getChatbotFaqPool } = await server.ssrLoadModule(
    '/src/lib/chatbotMatcher.ts',
  )

  const pool = getChatbotFaqPool()
  let passed = 0
  let failed = 0

  for (const { query, faqId } of cases) {
    const match = matchFaqAnswer(query)
    const expectedIds = Array.isArray(faqId) ? faqId : [faqId]

    if (match && expectedIds.includes(match.id)) {
      const expectedFaq = pool.find((faq) => faq.id === match.id)
      if (expectedFaq?.answer === match.answer) {
        console.log(`PASS: "${query}" -> ${match.id}`)
        passed += 1
        continue
      }
    }

    {
      console.error(`FAIL: "${query}"`)
      console.error(`  expected: ${expectedIds.join(' or ')}`)
      console.error(`  got:      ${match?.id ?? 'null'}`)
      failed += 1
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
} finally {
  await server.close()
}
