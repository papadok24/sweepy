import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { parseListItems } from '../utils/chore-list'
import { currentWeekClock } from '../utils/household-settings'

/** A day-bucket assignment plus its completion status for the current week. */
export type WeekDayEntry = {
  choreId: number
  choreName: string
  choreNotes: string | null
  /** Ordered List labels for Edit; Today cue uses length only. */
  choreListItems: string[]
  completed: boolean
  completedAt: number | null
}

export type WeekDay = {
  dayOfWeek: number
  assignments: WeekDayEntry[]
}

export type WeekView = {
  weekStart: string
  /** Household “today” day bucket (0 = Monday … 6 = Sunday). */
  todayDayOfWeek: number
  days: WeekDay[]
}

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

  const completionByKey = new Map(
    weekCompletions.map(c => [`${c.choreId}:${c.dayOfWeek}`, c] as const),
  )

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
    })
  }

  return { weekStart, todayDayOfWeek, days }
})
