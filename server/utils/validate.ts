import type { H3Event } from 'h3'
import type { z } from 'zod'

/**
 * Parse a request body against a Zod schema, throwing a 400 with readable
 * field errors on failure.
 *
 * Named distinctly from h3's `readValidatedBody` to avoid auto-import clashes.
 */
export async function readZodBody<S extends z.ZodType>(
  event: H3Event,
  schema: S,
): Promise<z.output<S>> {
  const body = await readBody(event)
  const result = schema.safeParse(body)
  if (!result.success) {
    const details = result.error.issues
      .map(issue => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ')
    throw createError({
      statusCode: 400,
      statusMessage: `Invalid request body: ${details}`,
    })
  }
  return result.data
}
