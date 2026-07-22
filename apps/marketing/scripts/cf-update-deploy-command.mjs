#!/usr/bin/env node
/**
 * Updates new-website Cloudflare Builds trigger deploy_command and optionally
 * triggers a manual build. Requires user-scoped API token with Workers Builds
 * Configuration: Edit (CLOUDFLARE_BUILDS_API_TOKEN) or falls back to
 * CLOUDFLARE_API_TOKEN.
 */
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
const apiToken =
  process.env.CLOUDFLARE_BUILDS_API_TOKEN ?? process.env.CLOUDFLARE_API_TOKEN
const workerName = process.env.CF_WORKER_NAME ?? 'new-website'
const deployCommand = process.env.CF_DEPLOY_COMMAND ?? 'npm run deploy:production'
const triggerBuild = process.env.CF_TRIGGER_BUILD !== 'false'

if (!accountId || !apiToken) {
  console.error('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required.')
  process.exit(1)
}

const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}`

async function cf(path, init = {}) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body.success === false) {
    const msg = body.errors?.map((e) => e.message).join('; ') || res.statusText
    throw new Error(`${init.method ?? 'GET'} ${path} failed: ${msg}`)
  }
  return body
}

const scripts = await cf('/workers/scripts')
const worker = scripts.result?.find((s) => s.id === workerName)
if (!worker?.tag) {
  throw new Error(`Worker "${workerName}" not found in account ${accountId}`)
}

console.log(`Worker tag for ${workerName}: ${worker.tag}`)

const triggers = await cf(`/builds/workers/${worker.tag}/triggers`)
const production =
  triggers.result?.find((t) => t.branch_includes?.includes('main')) ??
  triggers.result?.[0]

if (!production?.trigger_uuid) {
  throw new Error(`No build trigger found for ${workerName}`)
}

console.log(`Updating trigger ${production.trigger_uuid} deploy_command → ${deployCommand}`)

const updated = await cf(`/builds/triggers/${production.trigger_uuid}`, {
  method: 'PATCH',
  body: JSON.stringify({
    deploy_command: deployCommand,
    build_command: production.build_command ?? 'npm run build',
  }),
})

console.log(
  `Deploy command set to: ${updated.result?.deploy_command ?? deployCommand}`,
)

if (triggerBuild) {
  const build = await cf(`/builds/triggers/${production.trigger_uuid}/builds`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
  console.log(`Triggered build: ${build.result?.build_uuid ?? '(see dashboard)'}`)
}
