// https://nuxt.com/docs/api/configuration/nuxt-config
const d1DatabaseId = process.env.CLOUDFLARE_D1_DATABASE_ID

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  modules: ['@nuxthub/core'],
  devtools: { enabled: true },
  hub: {
    // Local: file SQLite in `.data/db/`. Production: set CLOUDFLARE_D1_DATABASE_ID for D1.
    db: d1DatabaseId
      ? {
          dialect: 'sqlite',
          driver: 'd1',
          connection: { databaseId: d1DatabaseId },
        }
      : 'sqlite',
  },
})
