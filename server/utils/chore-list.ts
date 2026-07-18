import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import {
  LIST_FULL_HINT,
  LIST_ITEM_MAX_LENGTH,
  LIST_ITEM_TOO_LONG_HINT,
  LIST_MAX_ITEMS,
} from '#shared/utils/chore-limits'

export type ListItemsResponse = {
  listItems: string[]
}

/** Normalize DB JSON (or legacy null) to an ordered label array. */
export function parseListItems(raw: unknown): string[] {
  if (Array.isArray(raw) && raw.every(item => typeof item === 'string')) {
    return raw
  }
  return []
}

export async function loadChoreListItems(choreId: number): Promise<string[]> {
  const [row] = await db
    .select({ listItems: schema.chores.listItems })
    .from(schema.chores)
    .where(eq(schema.chores.id, choreId))
    .limit(1)

  return parseListItems(row?.listItems)
}

export async function saveChoreListItems(
  choreId: number,
  listItems: string[],
): Promise<string[]> {
  const [updated] = await db
    .update(schema.chores)
    .set({ listItems })
    .where(eq(schema.chores.id, choreId))
    .returning({ listItems: schema.chores.listItems })

  if (!updated) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to update list' })
  }

  return parseListItems(updated.listItems)
}

/** Prepend a trimmed label; throws 400 on soft-cap / empty. */
export function prependListItem(items: string[], rawLabel: string): string[] {
  const label = rawLabel.trim()
  if (!label) {
    throw createError({
      statusCode: 400,
      statusMessage: 'List item label is required',
    })
  }
  if (label.length > LIST_ITEM_MAX_LENGTH) {
    throw createError({
      statusCode: 400,
      statusMessage: LIST_ITEM_TOO_LONG_HINT,
    })
  }
  if (items.length >= LIST_MAX_ITEMS) {
    throw createError({
      statusCode: 400,
      statusMessage: LIST_FULL_HINT,
    })
  }
  return [label, ...items]
}

export function removeListItemAt(items: string[], index: number): string[] {
  if (!Number.isInteger(index) || index < 0 || index >= items.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'List item index is out of range',
    })
  }
  return items.filter((_, i) => i !== index)
}
