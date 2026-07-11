/**
 * Monday-start week helpers. Weeks run Monday–Sunday; day buckets use
 * 0 = Monday … 6 = Sunday.
 */

function formatIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** ISO date (YYYY-MM-DD) of the Monday that begins `date`'s week. */
export function weekStartFor(date: Date = new Date()): string {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = local.getDay() // 0 = Sunday … 6 = Saturday
  const mondayOffset = day === 0 ? -6 : 1 - day
  local.setDate(local.getDate() + mondayOffset)
  return formatIsoDate(local)
}
