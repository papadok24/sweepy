/**
 * Sweeps look-back helpers — Week windows, labels, and series rules (ADR 0010).
 * Completions count as sparkles in UI copy; this module stays Completion-agnostic
 * on the data side (counts in, sparkle-shaped series out).
 */

export type SweepsFilter = 'lately' | 'awhile' | 'forever'

export type SweepsWeekSparkle = {
  weekId: string
  label: string
  sparkles: number
  isCurrent: boolean
}

export const FILTER_DEFINITIONS: Record<SweepsFilter, string> = {
  lately: 'Sparkles from the last 4 Weeks.',
  awhile: 'Sparkles from the last 8 Weeks.',
  forever: 'Every sparkle this household has ever earned.',
}

export const FILTER_WEEK_COUNTS: Record<Exclude<SweepsFilter, 'forever'>, number> = {
  lately: 4,
  awhile: 8,
}

/** Shift a Monday ISO date by whole Weeks (negative = earlier). */
export function shiftWeekStart(weekStart: string, weeksDelta: number): string {
  const [y, m, d] = weekStart.split('-').map(Number)
  const date = new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0))
  date.setUTCDate(date.getUTCDate() + weeksDelta * 7)
  const yy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

/** Last `count` Mondays including current, newest first. */
export function weekWindowStarts(currentWeekStart: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => shiftWeekStart(currentWeekStart, -i))
}

/** Human Week label for Sweeps postcards. */
export function weekLabel(weekStart: string, currentWeekStart: string): string {
  if (weekStart === currentWeekStart) return 'This week'
  const [y, m, d] = weekStart.split('-').map(Number)
  const date = new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0))
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

/**
 * Over-time Week series for a filter.
 * Lately/A while: fixed window with quiet zeros.
 * Forever: Weeks with ≥1 sparkle, plus always the current Week.
 */
export function buildWeekSeries(input: {
  filter: SweepsFilter
  currentWeekStart: string
  sparklesByWeek: Map<string, number>
}): SweepsWeekSparkle[] {
  const { filter, currentWeekStart, sparklesByWeek } = input

  if (filter === 'forever') {
    const ids = new Set<string>([currentWeekStart])
    for (const [weekId, count] of sparklesByWeek) {
      if (count > 0) ids.add(weekId)
    }
    return [...ids]
      .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
      .map(weekId => toWeekSparkle(weekId, currentWeekStart, sparklesByWeek))
  }

  const count = FILTER_WEEK_COUNTS[filter]
  return weekWindowStarts(currentWeekStart, count).map(weekId =>
    toWeekSparkle(weekId, currentWeekStart, sparklesByWeek),
  )
}

function toWeekSparkle(
  weekId: string,
  currentWeekStart: string,
  sparklesByWeek: Map<string, number>,
): SweepsWeekSparkle {
  return {
    weekId,
    label: weekLabel(weekId, currentWeekStart),
    sparkles: sparklesByWeek.get(weekId) ?? 0,
    isCurrent: weekId === currentWeekStart,
  }
}

/** Brightest Week among the rendered series with sparkles > 0. */
export function pickPeak(weeks: SweepsWeekSparkle[]): SweepsWeekSparkle | null {
  let best: SweepsWeekSparkle | null = null
  for (const week of weeks) {
    if (week.sparkles <= 0) continue
    if (!best || week.sparkles > best.sparkles) best = week
  }
  return best
}

export type SweepsChoreSparkle = {
  choreId: number
  name: string
  sparkles: number
  archived?: boolean
}

/** Server snapshot contract for the Sweeps Scrapbook (ADR 0010). */
export type SweepsSnapshot = {
  filter: SweepsFilter
  definition: string
  totalSparkles: number
  weeks: SweepsWeekSparkle[]
  chores: SweepsChoreSparkle[]
  peak: SweepsWeekSparkle | null
  empty: boolean
}
