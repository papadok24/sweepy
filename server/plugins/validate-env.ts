// Fail fast in dev: touch the validated env at server startup so a missing
// secret surfaces at boot instead of on first use. Dev-only because on
// Cloudflare Workers runtime config overrides are only reliably available
// inside a request context — in production, useEnv() validates lazily on
// first access instead.
export default defineNitroPlugin(() => {
  if (import.meta.dev) {
    useEnv()
  }
})
