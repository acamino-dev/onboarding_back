import { z } from 'zod'
import { ValidationError } from '../../../../shared/constants/errors'
import type { RequestBody } from '../types/RequestBody'

const schema = z.object({
  rfc: z.string().regex(/^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/, 'Invalid RFC format'),
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

  return result.data
}
