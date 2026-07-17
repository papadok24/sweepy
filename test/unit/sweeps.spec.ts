import { describe, expect, it } from 'vitest'
import {
  buildWeekSeries,
  shiftWeekStart,
  weekLabel,
  weekWindowStarts,
} from '../../server/utils/sweeps'

describe('shiftWeekStart', () => {
  it('steps Monday ISO dates by whole Weeks', () => {
    expect(shiftWeekStart('2026-07-13', -1)).toBe('2026-07-06')
    expect(shiftWeekStart('2026-07-13', -3)).toBe('2026-06-22')
    expect(shiftWeekStart('2026-07-06', 1)).toBe('2026-07-13')
  })
})

describe('weekWindowStarts', () => {
  it('returns the last N Mondays including current, newest first', () => {
    expect(weekWindowStarts('2026-07-13', 4)).toEqual([
      '2026-07-13',
      '2026-07-06',
      '2026-06-29',
      '2026-06-22',
    ])
  })
})

describe('weekLabel', () => {
  it('labels the current Week as This week', () => {
    expect(weekLabel('2026-07-13', '2026-07-13')).toBe('This week')
  })

  it('labels prior Weeks with a short month-day stamp', () => {
    expect(weekLabel('2026-07-06', '2026-07-13')).toBe('Jul 6')
    expect(weekLabel('2026-06-29', '2026-07-13')).toBe('Jun 29')
  })
})

describe('buildWeekSeries', () => {
  const current = '2026-07-13'
  const sparklesByWeek = new Map([
    ['2026-07-13', 9],
    ['2026-07-06', 14],
    ['2026-06-22', 6],
    ['2026-04-13', 5],
  ])

  it('keeps quiet empty slots for Lately and A while', () => {
    const weeks = buildWeekSeries({
      filter: 'lately',
      currentWeekStart: current,
      sparklesByWeek,
    })
    expect(weeks).toHaveLength(4)
    expect(weeks.map(w => w.weekId)).toEqual([
      '2026-07-13',
      '2026-07-06',
      '2026-06-29',
      '2026-06-22',
    ])
    expect(weeks.find(w => w.weekId === '2026-06-29')).toEqual(
      expect.objectContaining({ sparkles: 0, isCurrent: false }),
    )
  })

  it('omits historical zero Weeks on Forever but always keeps current', () => {
    const weeks = buildWeekSeries({
      filter: 'forever',
      currentWeekStart: current,
      sparklesByWeek: new Map([
        ['2026-07-06', 14],
        ['2026-06-22', 6],
      ]),
    })
    expect(weeks.map(w => w.weekId)).toEqual([
      '2026-07-13',
      '2026-07-06',
      '2026-06-22',
    ])
    expect(weeks[0]).toEqual(
      expect.objectContaining({
        weekId: '2026-07-13',
        sparkles: 0,
        isCurrent: true,
      }),
    )
  })
})
