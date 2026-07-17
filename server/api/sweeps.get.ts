import { gte, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from 'hub:db'
import { currentWeekClock } from '../utils/household-settings'
import {
  FILTER_DEFINITIONS,
  FILTER_WEEK_COUNTS,
  buildWeekSeries,
  pickPeak,
  shiftWeekStart,
  type SweepsChoreSparkle,
  type SweepsSnapshot,
} from '../utils/sweeps'

export type { SweepsSnapshot } from '../utils/sweeps'

const filterSchema = z.enum(['lately', 'awhile', 'forever'])

/**
 * Celebratory look-back snapshot (ADR 0010). Scoped by playful filter;
 * Completions stay anonymous; UI copy calls counts sparkles.
 */
export default eventHandler(async (event): Promise<SweepsSnapshot> => {
  const raw = getQuery(event).filter
  const parsed = filterSchema.safeParse(
    raw === undefined || raw === '' || Array.isArray(raw) ? 'lately' : raw,
  )
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid filter (expected lately, awhile, or forever)',
    })
  }
  const filter = parsed.data

  const { weekStart: currentWeekStart } = await currentWeekClock(event)

  const weekBound
    = filter === 'forever'
      ? null
      : shiftWeekStart(currentWeekStart, -(FILTER_WEEK_COUNTS[filter] - 1))

  const completionRows = weekBound
    ? await db
      .select({
        choreId: schema.completions.choreId,
        weekStart: schema.completions.weekStart,
      })
      .from(schema.completions)
      .where(gte(schema.completions.weekStart, weekBound))
    : await db
      .select({
        choreId: schema.completions.choreId,
        weekStart: schema.completions.weekStart,
      })
      .from(schema.completions)

  const sparklesByWeek = new Map<string, number>()
  const sparklesByChore = new Map<number, number>()
  for (const row of completionRows) {
    sparklesByWeek.set(row.weekStart, (sparklesByWeek.get(row.weekStart) ?? 0) + 1)
    sparklesByChore.set(row.choreId, (sparklesByChore.get(row.choreId) ?? 0) + 1)
  }

  const weeks = buildWeekSeries({
    filter,
    currentWeekStart,
    sparklesByWeek,
  })

  const totalSparkles = [...sparklesByChore.values()].reduce((sum, n) => sum + n, 0)
  const empty = totalSparkles === 0

  if (empty) {
    return {
      filter,
      definition: FILTER_DEFINITIONS[filter],
      totalSparkles: 0,
      weeks,
      chores: [],
      peak: null,
      empty: true,
    }
  }

  const choreIds = [...sparklesByChore.keys()]
  const choreRows = choreIds.length === 0
    ? []
    : await db
      .select({
        id: schema.chores.id,
        name: schema.chores.name,
        active: schema.chores.active,
      })
      .from(schema.chores)
      .where(inArray(schema.chores.id, choreIds))

  const choreMeta = new Map(choreRows.map(c => [c.id, c] as const))

  const chores: SweepsChoreSparkle[] = [...sparklesByChore.entries()]
    .filter(([, sparkles]) => sparkles > 0)
    .map(([choreId, sparkles]) => {
      const meta = choreMeta.get(choreId)
      const entry: SweepsChoreSparkle = {
        choreId,
        name: meta?.name ?? `Chore ${choreId}`,
        sparkles,
      }
      if (meta && !meta.active) entry.archived = true
      return entry
    })
    .sort((a, b) => b.sparkles - a.sparkles || a.name.localeCompare(b.name))

  return {
    filter,
    definition: FILTER_DEFINITIONS[filter],
    totalSparkles,
    weeks,
    chores,
    peak: pickPeak(weeks),
    empty: false,
  }
})
