import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { parseEnv } from '../../server/utils/env'

// The real schema is empty until the first runtime secret lands (Better Auth),
// so we prove the pipeline with a fake schema: same code path useEnv() takes.
const schema = z.object({
  fakeSecret: z.string().min(1),
  fakeUrl: z.url(),
})

describe('parseEnv', () => {
  it('returns the typed config when valid', () => {
    const env = parseEnv(schema, {
      fakeSecret: 'shh',
      fakeUrl: 'https://example.com',
      extraNuxtKey: 'ignored',
    })

    expect(env).toEqual({ fakeSecret: 'shh', fakeUrl: 'https://example.com' })
  })

  it('throws a single error listing every missing or invalid key', () => {
    expect(() => parseEnv(schema, { fakeUrl: 'not-a-url' })).toThrowError(
      /fakeSecret[\s\S]*fakeUrl/,
    )
  })
})
