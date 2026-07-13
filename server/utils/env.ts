import { z } from 'zod'
import type { H3Event } from 'h3'
import { assertValidTimeZone } from './week'

/**
 * Typed, validated access to runtime configuration. This is the only door
 * to runtime env in app code — never read `process.env` in server code.
 * (Build/deploy-time vars in nuxt.config.ts and scripts/ are the exception;
 * they run in Node before the app exists.)
 *
 * To add a variable (e.g. a Better Auth secret):
 * 1. Declare it in `runtimeConfig` in nuxt.config.ts with an empty default:
 *      runtimeConfig: { betterAuthSecret: '' }
 * 2. Add it to `envSchema` below:
 *      betterAuthSecret: z.string().min(32)
 * 3. Provide the value (note the NUXT_ prefix):
 *      - local: `NUXT_BETTER_AUTH_SECRET=...` in `.env`
 *      - production: `pnpm exec wrangler secret put NUXT_BETTER_AUTH_SECRET`
 * 4. Read it in server code: `useEnv(event).betterAuthSecret`
 *
 * Client-exposed values go under `runtimeConfig.public` and are NOT
 * validated here — they are visible to browsers and must never be secrets.
 */
export const householdTimezoneSchema = z
  .string()
  .trim()
  .min(1, 'householdTimezone is required')
  .superRefine((value, ctx) => {
    try {
      assertValidTimeZone(value)
    }
    catch (error) {
      ctx.addIssue({
        code: 'custom',
        message: error instanceof Error ? error.message : 'Invalid IANA timezone',
      })
    }
  })

export const envSchema = z.object({
  /** IANA zone used to seed household settings when no DB row exists yet. */
  householdTimezone: householdTimezoneSchema,
})

export type Env = z.output<typeof envSchema>

/**
 * Parses a config object against a schema, throwing a readable error that
 * lists every missing or invalid key. Pure — exported for unit tests.
 */
export function parseEnv<S extends z.ZodType>(schema: S, config: unknown): z.output<S> {
  const result = schema.safeParse(config)
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n')
    throw new Error(
      `Invalid runtime environment:\n${details}\n`
      + 'See server/utils/env.ts for how to declare and provide values.',
    )
  }
  return result.data
}

let cached: Env | undefined

/**
 * Validated runtime env. Parses once on first access, then serves the cached
 * result. Pass the event when you have one so per-request config overrides
 * (Cloudflare Workers) are picked up.
 */
export function useEnv(event?: H3Event): Env {
  cached ??= parseEnv(envSchema, useRuntimeConfig(event))
  return cached
}
