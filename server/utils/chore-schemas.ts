import { z } from 'zod'
import { NOTES_MAX_LENGTH } from '#shared/utils/chore-limits'

/** 0 = Monday … 6 = Sunday */
export const dayOfWeekSchema = z.number().int().min(0).max(6)
export type DayOfWeek = z.infer<typeof dayOfWeekSchema>

const notesCreateSchema = z.string().trim().max(NOTES_MAX_LENGTH).optional()
const notesUpdateSchema = z.string().trim().max(NOTES_MAX_LENGTH).nullable().optional()

export const createChoreBody = z.object({
  name: z.string().trim().min(1),
  notes: notesCreateSchema,
  /** Optional day buckets. Duplicates are deduped server-side. */
  days: z.array(dayOfWeekSchema).optional(),
})

export const updateChoreBody = z.object({
  name: z.string().trim().min(1).optional(),
  notes: notesUpdateSchema,
})

/** Soft caps for label length / list size are enforced in chore-list helpers. */
export const addListItemBody = z.object({
  label: z.string(),
})

export const createAssignmentBody = z.object({
  dayOfWeek: dayOfWeekSchema,
})

export const completeBody = z.object({
  choreId: z.number().int().positive(),
  dayOfWeek: dayOfWeekSchema,
})
