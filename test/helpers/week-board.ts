import { $fetch } from '@nuxt/test-utils/e2e'
import type { Chore, WeekView } from './api-types.ts'

export async function createChore(name: string) {
  return await $fetch<Chore>('/api/chores', {
    method: 'POST',
    body: { name },
  })
}

export async function assignChore(choreId: number, dayOfWeek: number) {
  await $fetch(`/api/chores/${choreId}/assignments`, {
    method: 'POST',
    body: { dayOfWeek },
  })
}

export function findAssignmentByName(
  week: WeekView,
  choreName: string,
  dayOfWeek: number,
) {
  return week.days
    .find(d => d.dayOfWeek === dayOfWeek)
    ?.assignments.find(a => a.choreName === choreName)
}

export function findAssignmentById(
  week: WeekView,
  choreId: number,
  dayOfWeek: number,
) {
  return week.days
    .find(d => d.dayOfWeek === dayOfWeek)
    ?.assignments.find(a => a.choreId === choreId)
}

export function checkboxSelector(choreId: number, dayOfWeek: number) {
  return `[data-week-chore="${choreId}"][data-day-of-week="${dayOfWeek}"]`
}

export function editNameSelector(choreId: number) {
  return `[data-edit-chore="${choreId}"]`
}
