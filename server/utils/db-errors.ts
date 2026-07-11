/**
 * Walk an error cause chain looking for a SQLite unique-constraint failure.
 * Drizzle wraps libsql errors, so the UNIQUE message often lives on `.cause`.
 */
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error
  while (current) {
    if (typeof current === 'object' && current !== null) {
      const record = current as { message?: unknown, code?: unknown, cause?: unknown }
      const message = typeof record.message === 'string' ? record.message.toLowerCase() : ''
      const code = typeof record.code === 'string' ? record.code.toUpperCase() : ''
      if (
        message.includes('unique')
        || code.includes('CONSTRAINT_UNIQUE')
      ) {
        return true
      }
      current = record.cause
      continue
    }
    break
  }
  return false
}

/** Run `fn`; map unique-constraint failures to a 409 with `conflictMessage`. */
export async function withUniqueConflict<T>(
  fn: () => Promise<T>,
  conflictMessage: string,
): Promise<T> {
  try {
    return await fn()
  }
  catch (error) {
    if (isUniqueViolation(error)) {
      throw createError({
        statusCode: 409,
        statusMessage: conflictMessage,
      })
    }
    throw error
  }
}
