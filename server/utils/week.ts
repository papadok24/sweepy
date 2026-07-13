/**
 * Monday-start week helpers. Weeks run Monday–Sunday; day buckets use
 * 0 = Monday … 6 = Sunday.
 *
 * Use `weekClockAt(instant, timeZone)` for household Week identity (ADR 0008).
 */

import { assertValidTimeZone } from './timezone'

export type WeekClock = {
  /** ISO date (YYYY-MM-DD) of the Monday that begins the Week. */
  weekStart: string
  /** 0 = Monday … 6 = Sunday in the given timezone’s civil calendar. */
  todayDayOfWeek: number
}

const WEEKDAY_TO_MON0: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
}

function formatIsoDateUtc(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

/**
 * Civil Y-M-D and Monday-based day index for `instant` in `timeZone`.
 */
function zonedCivilDay(instant: Date, timeZone: string): {
  year: number
  month: number
  day: number
  todayDayOfWeek: number
} {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(instant)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(p => p.type === type)?.value

  const weekday = get('weekday')
  const todayDayOfWeek = weekday ? WEEKDAY_TO_MON0[weekday] : undefined
  const year = Number(get('year'))
  const month = Number(get('month'))
  const day = Number(get('day'))

  if (
    todayDayOfWeek === undefined
    || !Number.isFinite(year)
    || !Number.isFinite(month)
    || !Number.isFinite(day)
  ) {
    throw new Error(`Failed to resolve civil day in timezone ${timeZone}`)
  }

  return { year, month, day, todayDayOfWeek }
}

/**
 * Week identity and household “today” for an instant in an IANA zone.
 * Week begins at local Monday 00:00 civil time (DST-aware via Intl).
 */
export function weekClockAt(instant: Date, timeZone: string): WeekClock {
  assertValidTimeZone(timeZone)
  const { year, month, day, todayDayOfWeek } = zonedCivilDay(instant, timeZone)

  // Calendar-day arithmetic at UTC noon avoids DST hour gaps when stepping back.
  const utcNoon = Date.UTC(year, month - 1, day, 12, 0, 0)
  const monday = new Date(utcNoon - todayDayOfWeek * 24 * 60 * 60 * 1000)

  return {
    weekStart: formatIsoDateUtc(
      monday.getUTCFullYear(),
      monday.getUTCMonth() + 1,
      monday.getUTCDate(),
    ),
    todayDayOfWeek,
  }
}
