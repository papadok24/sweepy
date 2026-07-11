import { describe, expect, it } from 'vitest'
import { weekStartFor } from '../../server/utils/week'

describe('weekStartFor', () => {
  it('maps Sunday to the Monday that began that week', () => {
    // Sunday 2026-07-12 belongs to the week that started Monday 2026-07-06
    expect(weekStartFor(new Date(2026, 6, 12))).toBe('2026-07-06')
  })

  it('maps Monday to itself', () => {
    expect(weekStartFor(new Date(2026, 6, 6))).toBe('2026-07-06')
  })

  it('maps Saturday to that week\'s Monday', () => {
    expect(weekStartFor(new Date(2026, 6, 11))).toBe('2026-07-06')
  })
})
