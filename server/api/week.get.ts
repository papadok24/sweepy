import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import type { WeekDay, WeekView } from '#shared/types/week'
import { parseListItems } from '../utils/chore-list'
import { currentWeekClock } from '../utils/household-settings'

export type { WeekDayEntry, WeekDay, WeekView } from '#shared/types/week'

export default eventHandler(async (event): Promise<WeekView> => {
  const { weekStart, todayDayOfWeek } = await currentWeekClock(event)

  const rows = await db
    .select({
      choreId: schema.choreAssignments.choreId,
      dayOfWeek: schema.choreAssignments.dayOfWeek,
      choreName: schema.chores.name,
      choreNotes: schema.chores.notes,
      choreListItems: schema.chores.listItems,
    })
    .from(schema.choreAssignments)
    .innerJoin(schema.chores, eq(schema.choreAssignments.choreId, schema.chores.id))
    .where(eq(schema.chores.active, true))

  const weekCompletions = await db
    .select()
    .from(schema.completions)
    .where(eq(schema.completions.weekStart, weekStart))

  const weekRainChecks = await db
    .select({ choreId: schema.choreWeekSkips.choreId })
    .from(schema.choreWeekSkips)
    .where(eq(schema.choreWeekSkips.weekStart, weekStart))

  const completionByKey = new Map(
    weekCompletions.map(c => [`${c.choreId}:${c.dayOfWeek}`, c] as const),
  )
  const rainCheckedChoreIds = new Set(weekRainChecks.map(s => s.choreId))

  const days: WeekDay[] = Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    assignments: [],
  }))

  for (const row of rows) {
    const completion = completionByKey.get(`${row.choreId}:${row.dayOfWeek}`)
    days[row.dayOfWeek]!.assignments.push({
      choreId: row.choreId,
      choreName: row.choreName,
      choreNotes: row.choreNotes,
      choreListItems: parseListItems(row.choreListItems),
      completed: Boolean(completion),
      completedAt: completion?.completedAt ?? null,
      rainChecked: rainCheckedChoreIds.has(row.choreId),
    })
  }

  return { weekStart, todayDayOfWeek, days }
})
