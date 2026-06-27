import { z } from 'zod'
import { ValidationError } from '../../../../shared/constants/errors'
import type { RequestBody } from '../types/RequestBody'

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'application/pdf'] as const

const schema = z.object({
  contentType: z.enum(ALLOWED_CONTENT_TYPES),
})

export const validateBody = (rawBody: string): RequestBody => {
  if (!rawBody) throw new ValidationError('Request body is empty')

  let parsed: unknown
  try {
    parsed = JSON.parse(rawBody)
  } catch {
    throw new ValidationError('Invalid JSON body')
  }

  const result = schema.safeParse(parsed)
  if (!result.success) {
    throw new ValidationError(JSON.stringify(result.error.flatten().fieldErrors))
  }

  return result.data as RequestBody
}
