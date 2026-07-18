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

export type { WeekView } from '../../shared/types/week'

export type {
  SweepsFilter,
  SweepsSnapshot,
} from '../../server/utils/sweeps'
