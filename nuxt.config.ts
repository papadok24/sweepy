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
  // ADR-0005: static rasters via Nuxt Image; build-time/static provider for Workers.
  // Lazy loading defaults via <AppImg> (module has no loading option).
  image: {
    provider: 'ipxStatic',
    format: ['avif', 'webp'],
    quality: 80,
  },
  hub: {
    // Local (`pnpm dev` / tests): always file SQLite in `.data/db/`.
    // Production build: `pnpm deploy` sets SWEEPY_DEPLOY=1 and requires CLOUDFLARE_D1_DATABASE_ID.
    db: isDeploy && d1DatabaseId
      ? {
          dialect: 'sqlite',
          driver: 'd1',
          connection: { databaseId: d1DatabaseId },
        }
      : 'sqlite',
  },
})
