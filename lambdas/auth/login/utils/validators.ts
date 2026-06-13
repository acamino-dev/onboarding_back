import { z } from 'zod'
import { ValidationError } from '../../../../shared/constants/errors'
import type { RequestBody } from '../types/RequestBody'

const loginSchema = z.object({
  email: z.string().email('email must be a valid email address'),
  password: z.string().min(1, 'password is required'),
})

export const validateBody = (rawBody: string): RequestBody => {
  if (!rawBody) throw new ValidationError('Request body is empty')

  let parsed: unknown
  try {
    parsed = JSON.parse(rawBody)
  } catch {
    throw new ValidationError('Invalid JSON body')
  }

  const result = loginSchema.safeParse(parsed)
  if (!result.success) {
    throw new ValidationError(JSON.stringify(result.error.flatten().fieldErrors))
  }

  return result.data
}
