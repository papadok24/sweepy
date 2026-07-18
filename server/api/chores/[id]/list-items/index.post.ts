import {
  loadChoreListItems,
  prependListItem,
  saveChoreListItems,
  type ListItemsResponse,
} from '../../../../utils/chore-list'
import { addListItemBody } from '../../../../utils/chore-schemas'
import { requireChore, requireChoreId } from '../../../../utils/chore-id'
import { readZodBody } from '../../../../utils/validate'

/**
 * Prepend a plain-text List item for a Chore.
 * Await-and-return (not optimistic) so soft-cap hints stay honest.
 */
export default eventHandler(async (event): Promise<ListItemsResponse> => {
  const id = requireChoreId(event)
  await requireChore(id)

  const body = await readZodBody(event, addListItemBody)
  const current = await loadChoreListItems(id)
  const next = prependListItem(current, body.label)
  const listItems = await saveChoreListItems(id, next)
  return { listItems }
})
