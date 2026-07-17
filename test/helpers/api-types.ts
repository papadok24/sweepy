export type Chore = {
  id: number
  name: string
  notes: string | null
  listItems: string[]
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
      choreListItems: string[]
      completed: boolean
      completedAt: number | null
    }>
  }>
}

export type {
  SweepsFilter,
  SweepsSnapshot,
} from '../../server/utils/sweeps'
