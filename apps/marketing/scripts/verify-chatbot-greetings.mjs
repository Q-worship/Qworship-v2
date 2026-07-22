#!/usr/bin/env node
/**
 * Greeting and thanks regression tests for resolveInstantChatbotReply().
 * Usage: node scripts/verify-chatbot-greetings.mjs
 */
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const greetingCases = [
  'hi',
  'hello there',
  'hey',
  'good morning',
  'how are you today',
  "how's it going",
  'how have you been',
  'nice to meet you',
]

const thanksCases = ['thanks', 'thank you', 'thx']

const frustrationCases = [
  'are you stupid',
  "you're dumb",
  'this is useless',
  'not helpful',
]

const returnToBotCases = [
  'back to bot',
  'talk to the assistant',
  'cancel agent',
  'never mind',
]

const notReturnToBotCases = [
  'what is qworship',
  'can you help with pricing',
]

const server = await createServer({
  root,
  server: { middlewareMode: true },
  logLevel: 'error',
})

try {
  const { resolveInstantChatbotReply, isReturnToBotIntent } = await server.ssrLoadModule('/src/lib/chatbot.ts')

  let passed = 0
  let failed = 0

  for (const query of greetingCases) {
    const reply = resolveInstantChatbotReply(query)
    if (reply?.type === 'text' && reply.text.length > 0) {
      console.log(`PASS: greeting "${query}"`)
      passed += 1
    } else {
      console.error(`FAIL: greeting "${query}" -> ${reply?.type ?? 'null'}`)
      failed += 1
    }
  }

  for (const query of thanksCases) {
    const reply = resolveInstantChatbotReply(query)
    if (reply?.type === 'text' && reply.text.length > 0) {
      console.log(`PASS: thanks "${query}"`)
      passed += 1
    } else {
      console.error(`FAIL: thanks "${query}" -> ${reply?.type ?? 'null'}`)
      failed += 1
    }
  }

  for (const query of frustrationCases) {
    const reply = resolveInstantChatbotReply(query)
    if (reply?.type === 'text' && reply.text.length > 0) {
      console.log(`PASS: frustration "${query}"`)
      passed += 1
    } else {
      console.error(`FAIL: frustration "${query}" -> ${reply?.type ?? 'null'}`)
      failed += 1
    }
  }

  for (const query of returnToBotCases) {
    if (isReturnToBotIntent(query)) {
      console.log(`PASS: return-to-bot "${query}"`)
      passed += 1
    } else {
      console.error(`FAIL: return-to-bot "${query}" should match`)
      failed += 1
    }
  }

  for (const query of notReturnToBotCases) {
    if (!isReturnToBotIntent(query)) {
      console.log(`PASS: not return-to-bot "${query}"`)
      passed += 1
    } else {
      console.error(`FAIL: return-to-bot "${query}" should not match`)
      failed += 1
    }
  }

  const handoff = resolveInstantChatbotReply('what is the meaning of life')
  if (handoff === null) {
    console.log('PASS: non-greeting unmatched query returns null')
    passed += 1
  } else {
    console.error(`FAIL: unmatched query should return null, got ${handoff.type}`)
    failed += 1
  }

  console.log(`\n${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
} finally {
  await server.close()
}
