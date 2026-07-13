import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { envSchema, parseEnv } from '../../server/utils/env'

describe('parseEnv', () => {
  // Prove the pipeline with a fake schema: same code path useEnv() takes.
  const schema = z.object({
    fakeSecret: z.string().min(1),
    fakeUrl: z.url(),
  })

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

describe('envSchema householdTimezone', () => {
  it('accepts a valid IANA timezone', () => {
    expect(parseEnv(envSchema, { householdTimezone: 'America/Chicago' })).toEqual({
      householdTimezone: 'America/Chicago',
    })
  })

  it('rejects missing householdTimezone', () => {
    expect(() => parseEnv(envSchema, {})).toThrowError(/householdTimezone/)
  })

  it('rejects blank householdTimezone', () => {
    expect(() => parseEnv(envSchema, { householdTimezone: '   ' })).toThrowError(
      /householdTimezone/,
    )
  })

  it('rejects an invalid IANA timezone', () => {
    expect(() => parseEnv(envSchema, { householdTimezone: 'Not/AZone' })).toThrowError(
      /timezone/i,
    )
  })
})
