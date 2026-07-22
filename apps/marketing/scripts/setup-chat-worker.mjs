#!/usr/bin/env node
/**
 * Creates CHAT_KV namespaces for production and preview.
 * Requires: wrangler login (or CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID)
 *
 * Usage: node scripts/setup-chat-worker.mjs
 */
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const wranglerPath = path.join(root, 'workers/whatsapp-chat/wrangler.toml')

function runWrangler(args) {
  return execSync(`npx wrangler ${args}`, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'inherit'],
  })
}

function parseNamespaceId(output) {
  const match = output.match(/id\s*=\s*"([^"]+)"/i)
  return match?.[1] ?? null
}

function updateWranglerToml(productionId, previewId) {
  let toml = readFileSync(wranglerPath, 'utf8')

  toml = toml.replace(
    /id = "00000000000000000000000000000001"/,
    `id = "${productionId}"`,
  )
  toml = toml.replace(
    /preview_id = "00000000000000000000000000000001"/,
    `preview_id = "${previewId}"`,
  )

  writeFileSync(wranglerPath, toml)
}

console.log('Checking Cloudflare authentication...')
try {
  runWrangler('whoami')
} catch {
  console.error('\nNot logged in. Run: wrangler login')
  console.error('Or set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.')
  process.exit(1)
}

console.log('\nCreating production KV namespace CHAT_KV...')
const prodOut = runWrangler('kv namespace create CHAT_KV --config workers/whatsapp-chat/wrangler.toml')
const productionId = parseNamespaceId(prodOut)

console.log('\nCreating preview KV namespace CHAT_KV...')
const previewOut = runWrangler(
  'kv namespace create CHAT_KV --preview --config workers/whatsapp-chat/wrangler.toml',
)
const previewId = parseNamespaceId(previewOut)

if (!productionId || !previewId) {
  console.error('\nCould not parse namespace IDs from wrangler output.')
  console.log('Production output:', prodOut)
  console.log('Preview output:', previewOut)
  process.exit(1)
}

updateWranglerToml(productionId, previewId)

console.log('\nUpdated workers/whatsapp-chat/wrangler.toml:')
console.log(`  id = "${productionId}"`)
console.log(`  preview_id = "${previewId}"`)
console.log('\nNext: set secrets (see DEPLOY.md) then run npm run deploy:chat-api')
