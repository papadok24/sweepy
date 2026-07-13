import { z } from 'zod'

/** 0 = Monday … 6 = Sunday */
export const dayOfWeekSchema = z.number().int().min(0).max(6)
export type DayOfWeek = z.infer<typeof dayOfWeekSchema>

export const createChoreBody = z.object({
  name: z.string().trim().min(1),
  notes: z.string().trim().optional(),
  /** Optional day buckets. Duplicates are deduped server-side. */
  days: z.array(dayOfWeekSchema).optional(),
})

export const updateChoreBody = z.object({
  name: z.string().trim().min(1).optional(),
  notes: z.string().trim().nullable().optional(),
})

export const createAssignmentBody = z.object({
  dayOfWeek: dayOfWeekSchema,
})

export const completeBody = z.object({
  choreId: z.number().int().positive(),
  dayOfWeek: dayOfWeekSchema,
})
