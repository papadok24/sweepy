/** Reject blank / non-IANA zone ids. Uses Intl (no silent UTC fallback). */
export function assertValidTimeZone(timeZone: string): string {
  if (!timeZone.trim()) {
    throw new Error('Invalid timezone: value must be a non-empty IANA zone')
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date())
  }
  catch {
    throw new Error(`Invalid timezone: ${timeZone} is not a recognized IANA zone`)
  }
  return timeZone
}
