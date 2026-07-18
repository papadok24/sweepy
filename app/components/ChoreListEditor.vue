<script setup lang="ts">
import {
  LIST_FULL_HINT,
  LIST_ITEM_MAX_LENGTH,
  LIST_ITEM_TOO_LONG_HINT,
  LIST_MAX_ITEMS,
} from '#shared/utils/chore-limits'

const props = defineProps<{
  choreId: number
  addItem: (choreId: number, label: string) => Promise<string[]>
  removeItem: (choreId: number, index: number) => Promise<string[]>
}>()

const items = defineModel<string[]>('items', { required: true })

const listBodyRef = ref<HTMLElement | null>(null)
const draft = ref('')
const error = ref<string | null>(null)
const saving = ref(false)

async function submitListItem() {
  const label = draft.value.trim()
  if (!label) return

  if (label.length > LIST_ITEM_MAX_LENGTH) {
    error.value = LIST_ITEM_TOO_LONG_HINT
    return
  }
  if (items.value.length >= LIST_MAX_ITEMS) {
    error.value = LIST_FULL_HINT
    return
  }

  error.value = null
  saving.value = true
  try {
    items.value = await props.addItem(props.choreId, label)
    draft.value = ''
    await nextTick()
    listBodyRef.value?.scrollTo({ top: 0 })
  }
  catch {
    error.value = 'Couldn’t add that item. Try again.'
  }
  finally {
    saving.value = false
  }
}

async function removeListItem(index: number) {
  error.value = null
  saving.value = true
  try {
    items.value = await props.removeItem(props.choreId, index)
  }
  catch {
    error.value = 'Couldn’t remove that item. Try again.'
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div
    class="edit-chore-list"
    data-edit-chore-list
  >
    <div
      ref="listBodyRef"
      class="edit-chore-list__body"
      data-edit-chore-list-body
    >
      <p
        v-if="items.length === 0"
        class="edit-chore-list__empty"
        data-edit-chore-list-empty
      >
        No items yet
      </p>
      <ul
        v-else
        class="edit-chore-list__items"
        data-edit-chore-list-items
      >
        <li
          v-for="(item, index) in items"
          :key="index"
          class="edit-chore-list__item"
          data-edit-chore-list-item
        >
          <span class="edit-chore-list__label">{{ item }}</span>
          <button
            type="button"
            class="btn control btn--secondary edit-chore-list__remove"
            data-edit-chore-list-remove
            :aria-label="`Remove ${item}`"
            :disabled="saving"
            @click="removeListItem(index)"
          >
            Remove
          </button>
        </li>
      </ul>
    </div>

    <p
      v-if="error"
      class="add-chore-drawer__error"
      data-edit-chore-list-error
      role="alert"
    >
      {{ error }}
    </p>

    <form
      class="edit-chore-list__add"
      data-edit-chore-list-add
      @submit.prevent="submitListItem"
    >
      <label class="sr-only" for="edit-chore-list-draft">Add list item</label>
      <input
        id="edit-chore-list-draft"
        v-model="draft"
        class="field control"
        data-edit-chore-list-draft
        name="listItem"
        type="text"
        autocomplete="off"
        placeholder="Add item"
        :disabled="saving"
      >
      <button
        type="submit"
        class="btn control btn--primary"
        data-edit-chore-list-submit
        :disabled="saving"
        :aria-busy="saving"
      >
        Add
      </button>
    </form>
  </div>
</template>
