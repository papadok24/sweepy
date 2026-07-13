import { describe, expect, it } from 'vitest'
import { weekClockAt } from '../../server/utils/week'

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

  it('keeps civil Monday after US spring-forward (America/Chicago)', () => {
    // 2026-03-08 spring forward 02:00 → 03:00. Monday 2026-03-09 00:00 CDT.
    const before = new Date('2026-03-09T04:59:59.999Z') // Sun 23:59 CDT
    const atMidnight = new Date('2026-03-09T05:00:00.000Z') // Mon 00:00 CDT
    expect(weekClockAt(before, 'America/Chicago')).toEqual({
      weekStart: '2026-03-02',
      todayDayOfWeek: 6,
    })
    expect(weekClockAt(atMidnight, 'America/Chicago')).toEqual({
      weekStart: '2026-03-09',
      todayDayOfWeek: 0,
    })
  })

  it('keeps civil Monday after US fall-back (America/Chicago)', () => {
    // 2026-11-01 fall back. Monday 2026-11-02 00:00 CST (UTC-6).
    const before = new Date('2026-11-02T05:59:59.999Z') // Sun 23:59 CST
    const atMidnight = new Date('2026-11-02T06:00:00.000Z') // Mon 00:00 CST
    expect(weekClockAt(before, 'America/Chicago')).toEqual({
      weekStart: '2026-10-26',
      todayDayOfWeek: 6,
    })
    expect(weekClockAt(atMidnight, 'America/Chicago')).toEqual({
      weekStart: '2026-11-02',
      todayDayOfWeek: 0,
    })
  })
})
