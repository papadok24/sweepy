import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/** Trivial plumbing table — not the chore domain model. */
export const placeholders = sqliteTable('placeholders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  label: text('label').notNull(),
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
})

export type Placeholder = typeof placeholders.$inferSelect
