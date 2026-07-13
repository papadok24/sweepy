export type Chore = {
  id: number
  name: string
  notes: string | null
  active: boolean
  createdAt: number
}

export type Assignment = {
  id: number
  choreId: number
  dayOfWeek: number
}

export type Completion = {
  id: number
  choreId: number
  dayOfWeek: number
  weekStart: string
  completedAt: number
}

export type WeekView = {
  weekStart: string
  todayDayOfWeek: number
  days: Array<{
    dayOfWeek: number
    assignments: Array<{
      choreId: number
      choreName: string
      choreNotes: string | null
      completed: boolean
      completedAt: number | null
    }>
  }>
}
