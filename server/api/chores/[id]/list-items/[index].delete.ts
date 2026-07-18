import {
  loadChoreListItems,
  removeListItemAt,
  saveChoreListItems,
  type ListItemsResponse,
} from '../../../../utils/chore-list'
import { requireChore, requireChoreId } from '../../../../utils/chore-id'

/**
 * Remove a List item by index (0-based, current order).
 */
export default eventHandler(async (event): Promise<ListItemsResponse> => {
  const id = requireChoreId(event)
  await requireChore(id)

  const raw = getRouterParam(event, 'index')
  const index = Number(raw)
  if (!Number.isInteger(index)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'List item index must be an integer',
    })
  }

  const current = await loadChoreListItems(id)
  const next = removeListItemAt(current, index)
  const listItems = await saveChoreListItems(id, next)
  return { listItems }
})
