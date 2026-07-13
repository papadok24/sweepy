/**
 * Atomic production deploy: build → apply D1 migrations → wrangler deploy.
 * Fails before deploy if CLOUDFLARE_D1_DATABASE_ID is missing or migrations fail.
 *
 * Sets SWEEPY_DEPLOY=1 so nuxt.config enables the D1 driver only for this build —
 * a CLOUDFLARE_D1_DATABASE_ID in `.env` will not affect local `pnpm dev`.
 *
 * Use `pnpm run deploy` — plain `pnpm deploy` is a reserved pnpm workspace command.
 *
 * In CI (GitHub Actions sets `CI=true`), also requires CLOUDFLARE_API_TOKEN and
 * CLOUDFLARE_ACCOUNT_ID. Local interactive deploys can use `wrangler login` instead.
 * Wrangler skips the migration confirmation prompt in non-interactive / CI shells.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

/** Load KEY=VALUE pairs from `.env` into process.env when unset (no dotenv dep). */
function loadDotEnv() {
  const path = resolve(process.cwd(), '.env')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

loadDotEnv()

const required = process.env.CI
  ? ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_D1_DATABASE_ID']
  : ['CLOUDFLARE_D1_DATABASE_ID']

const missing = required.filter((key) => !process.env[key])
if (missing.length > 0) {
  for (const key of missing) {
    console.error(`${key} is required for production deploy.`)
  }
  if (missing.includes('CLOUDFLARE_D1_DATABASE_ID')) {
    console.error('Set it after: pnpm exec wrangler d1 create sweepy')
  }
  if (process.env.CI) {
    console.error(
      'In GitHub Actions, set repository secrets: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID.',
    )
  }
  process.exit(1)
}

process.env.SWEEPY_DEPLOY = '1'
// NuxtHub 0.10 does not pick Cloudflare from D1 alone — Nitro must use a
// cloudflare* preset or setupCloudflare never runs and wrangler.json is missing.
process.env.NITRO_PRESET = 'cloudflare_module'

const wranglerConfig = '.output/server/wrangler.json'

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

console.log('→ Build (Cloudflare / D1)')
run('pnpm', ['exec', 'nuxt', 'build'])
console.log('→ Apply remote D1 migrations')
run('pnpm', ['exec', 'wrangler', 'd1', 'migrations', 'apply', 'DB', '--remote', '--config', wranglerConfig])
console.log('→ Deploy Worker')
run('pnpm', ['exec', 'wrangler', 'deploy', '--config', wranglerConfig])
