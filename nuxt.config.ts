// https://nuxt.com/docs/api/configuration/nuxt-config
const d1DatabaseId = process.env.CLOUDFLARE_D1_DATABASE_ID
const isDeploy = process.env.SWEEPY_DEPLOY === '1'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  modules: ['@nuxthub/core'],
  devtools: { enabled: true },
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
