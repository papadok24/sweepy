/** A day-bucket assignment plus its completion status for the current week. */
export type WeekDayEntry = {
  choreId: number
  choreName: string
  choreNotes: string | null
  /** Ordered List labels for Edit; Today cue uses length only. */
  choreListItems: string[]
  completed: boolean
  completedAt: number | null
  /** True when this Chore has a Rain check for the Week (chore-wide across day buckets). */
  rainChecked: boolean
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
