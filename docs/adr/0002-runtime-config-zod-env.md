# Runtime env via runtimeConfig + zod, not t3-env

Runtime configuration (upcoming Better Auth secrets, future API keys) flows through Nuxt `runtimeConfig` and is validated by a zod schema in `server/utils/env.ts` — the single accessor app code uses. We deliberately rejected the popular t3-env pattern of validating `process.env` directly: our production runtime is a Cloudflare Worker, where `process.env` is a compat shim whose behavior varies with compat dates/flags, while `runtimeConfig` is the seam Nitro designed for the Node-vs-workerd difference (NUXT_-prefixed Worker secrets, server keys stripped from the client bundle).

## Consequences

- App code never reads `process.env`. Build/deploy-time vars (`nuxt.config.ts`, `scripts/`) still do — they run in Node before the app exists, and `runtimeConfig` cannot serve them.
- Validation is parse-once-on-first-access with an eager dev-only touch at boot (`server/plugins/validate-env.ts`), because Workers have no meaningful startup and config overrides are only reliable in request context.
- Each new variable is declared twice (runtimeConfig default + zod schema) — accepted cost for a handful of keys.
