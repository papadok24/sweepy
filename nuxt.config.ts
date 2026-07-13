// https://nuxt.com/docs/api/configuration/nuxt-config
const d1DatabaseId = process.env.CLOUDFLARE_D1_DATABASE_ID
const isDeploy = process.env.SWEEPY_DEPLOY === '1'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  modules: ['@nuxthub/core', '@nuxt/icon', '@nuxt/image'],
  css: ['~/assets/css/main.css'],
  // ADR 0007: pinch-zoom stays allowed — never user-scalable=no / max-scale locks.
  app: {
    head: {
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, viewport-fit=cover',
        },
      ],
    },
  },
  devtools: { enabled: true },
  // ADR-0005: static rasters via Nuxt Image. Do not force `ipxStatic` —
  // that emits `/_ipx/...` URLs without a runtime handler unless you
  // `nuxt generate` and prerender them (Workers use `nuxt build`). Auto
  // picks IPX on Node (dev/tests) and `none` (public/ passthrough) on
  // non-Node nitro like Cloudflare Workers — no runtime sharp/IPX there.
  // Lazy loading defaults via <AppImg> (module has no loading option).
  image: {
    format: ['avif', 'webp'],
    quality: 80,
  },
  // Deploy builds must use a cloudflare* Nitro preset (see scripts/deploy.mjs).
  // Without it NuxtHub never runs setupCloudflare and `.output/server/wrangler.json`
  // is not written — `wrangler deploy` then fails with ENOENT.
  nitro: {
    ...(isDeploy ? { preset: 'cloudflare_module' as const } : {}),
    // Workers Logs + invocation metadata (Cloudflare dashboard Observability).
    cloudflare: {
      wrangler: {
        // Stable production Worker name (ADR 0009). Cutover from any
        // auto-generated name is a one-time human checklist in the README.
        name: 'sweepy',
        observability: {
          enabled: true,
          logs: {
            enabled: true,
            invocation_logs: true,
          },
        },
      },
    },
  },
  hub: {
    // Local (`pnpm dev` / tests): always file SQLite in `.data/db/`.
    // Production build: `pnpm run deploy` sets SWEEPY_DEPLOY=1 and requires CLOUDFLARE_D1_DATABASE_ID.
    db: isDeploy && d1DatabaseId
      ? {
          dialect: 'sqlite',
          driver: 'd1',
          connection: { databaseId: d1DatabaseId },
          // D1 is unreachable at build time; migrations run in scripts/deploy.mjs.
          applyMigrationsDuringBuild: false,
        }
      : 'sqlite',
  },
  // NUXT_HOUSEHOLD_TIMEZONE — seeds household settings on first need (ADR 0008).
  runtimeConfig: {
    householdTimezone: '',
  },
})
