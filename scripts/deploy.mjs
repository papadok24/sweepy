/**
 * Atomic production deploy: build → apply D1 migrations → wrangler deploy.
 * Fails before deploy if CLOUDFLARE_D1_DATABASE_ID is missing or migrations fail.
 *
 * Sets SWEEPY_DEPLOY=1 so nuxt.config enables the D1 driver only for this build —
 * a CLOUDFLARE_D1_DATABASE_ID in `.env` will not affect local `pnpm dev`.
 */
import { spawnSync } from 'node:child_process'

if (!process.env.CLOUDFLARE_D1_DATABASE_ID) {
  console.error('CLOUDFLARE_D1_DATABASE_ID is required for production deploy.')
  console.error('Set it after: pnpm exec wrangler d1 create sweepy')
  process.exit(1)
}

process.env.SWEEPY_DEPLOY = '1'

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

run('pnpm', ['exec', 'nuxt', 'build'])
run('pnpm', ['exec', 'wrangler', 'd1', 'migrations', 'apply', 'DB', '--remote', '--config', wranglerConfig])
run('pnpm', ['exec', 'wrangler', 'deploy', '--config', wranglerConfig])
