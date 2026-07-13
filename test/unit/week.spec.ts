import { describe, expect, it } from 'vitest'
import { weekClockAt, weekStartFor } from '../../server/utils/week'

describe('weekStartFor (host-local adapter)', () => {
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

describe('weekClockAt (IANA timezone)', () => {
  it('maps a mid-week instant in America/Chicago to that week\'s Monday and day index', () => {
    // Wednesday 2026-07-08 15:00 CDT (UTC-5) → weekStart 2026-07-06, day 2
    const instant = new Date('2026-07-08T20:00:00.000Z')
    expect(weekClockAt(instant, 'America/Chicago')).toEqual({
      weekStart: '2026-07-06',
      todayDayOfWeek: 2,
    })
  })

  it('keeps Sunday just before local Monday midnight in the prior week', () => {
    // 2026-07-12 23:59:59.999 CDT = 2026-07-13T04:59:59.999Z
    const instant = new Date('2026-07-13T04:59:59.999Z')
    expect(weekClockAt(instant, 'America/Chicago')).toEqual({
      weekStart: '2026-07-06',
      todayDayOfWeek: 6,
    })
  })

  it('starts a new week at local Monday civil midnight', () => {
    // 2026-07-13 00:00:00 CDT = 2026-07-13T05:00:00.000Z
    const instant = new Date('2026-07-13T05:00:00.000Z')
    expect(weekClockAt(instant, 'America/Chicago')).toEqual({
      weekStart: '2026-07-13',
      todayDayOfWeek: 0,
    })
  })

  it('does not depend on the host process timezone for asserted behavior', () => {
    // Same UTC instant as mid-week Chicago case — result is fixed by IANA zone
    const instant = new Date('2026-07-08T20:00:00.000Z')
    const chicago = weekClockAt(instant, 'America/Chicago')
    const tokyo = weekClockAt(instant, 'Asia/Tokyo')
    expect(chicago).toEqual({ weekStart: '2026-07-06', todayDayOfWeek: 2 })
    // 2026-07-09 05:00 JST → Thursday of week starting 2026-07-06
    expect(tokyo).toEqual({ weekStart: '2026-07-06', todayDayOfWeek: 3 })
  })

  it('rejects blank or invalid IANA timezones', () => {
    const instant = new Date('2026-07-08T20:00:00.000Z')
    expect(() => weekClockAt(instant, '')).toThrow(/timezone/i)
    expect(() => weekClockAt(instant, 'Not/AZone')).toThrow(/timezone/i)
  })
})
