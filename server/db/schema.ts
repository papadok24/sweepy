import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

/** Trivial plumbing table — not the chore domain model. */
export const placeholders = sqliteTable('placeholders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  label: text('label').notNull(),
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
})

export type Placeholder = typeof placeholders.$inferSelect

/** A recurring household task. Archived via `active = false`, never hard-deleted. */
export const chores = sqliteTable('chores', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  notes: text('notes'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
})

export type Chore = typeof chores.$inferSelect

/**
 * Current-schedule placement of a chore into a day bucket.
 * dayOfWeek: 0 = Monday … 6 = Sunday.
 */
export const choreAssignments = sqliteTable('chore_assignments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  choreId: integer('chore_id').notNull().references(() => chores.id),
  dayOfWeek: integer('day_of_week').notNull(),
}, table => [
  uniqueIndex('chore_assignments_chore_day_unique').on(table.choreId, table.dayOfWeek),
])

export type ChoreAssignment = typeof choreAssignments.$inferSelect

/**
 * Record that a chore on a day bucket was done in a given week.
 * No FK to assignments (ADR 0003) — history survives schedule changes.
 * weekStart is the ISO date (YYYY-MM-DD) of that week's Monday.
 */
export const completions = sqliteTable('completions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  choreId: integer('chore_id').notNull().references(() => chores.id),
  dayOfWeek: integer('day_of_week').notNull(),
  weekStart: text('week_start').notNull(),
  completedAt: integer('completed_at').notNull().$defaultFn(() => Date.now()),
}, table => [
  uniqueIndex('completions_chore_day_week_unique').on(
    table.choreId,
    table.dayOfWeek,
    table.weekStart,
  ),
])

export type Completion = typeof completions.$inferSelect

/**
 * Singleton household preferences (ADR 0008). One row (`id = 1`) for the
 * shared board — starts with IANA timezone for Week boundaries / “today”.
 */
export const householdSettings = sqliteTable('household_settings', {
  id: integer('id').primaryKey(),
  timezone: text('timezone').notNull(),
})

export type HouseholdSettings = typeof householdSettings.$inferSelect
