/** Soft caps for Chore Notes and List (PRD #78). */

export const NOTES_MAX_LENGTH = 4000
export const LIST_MAX_ITEMS = 50
export const LIST_ITEM_MAX_LENGTH = 100

export const NOTES_TOO_LONG_HINT
  = 'Notes are a bit long — keep them under 4000 characters.'

export const LIST_FULL_HINT
  = 'That list is full — remove an item before adding another.'

export const LIST_ITEM_TOO_LONG_HINT
  = 'That item is a bit long — keep it under 100 characters.'

/** Soft-fail hint when Notes exceed the cap; null when within limit. */
export function getNotesLengthError(notes: string): string | null {
  return notes.length > NOTES_MAX_LENGTH ? NOTES_TOO_LONG_HINT : null
}
