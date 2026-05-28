import { z } from 'zod'
import { ValidationError } from '../../../shared/constants/errors'
import type { RequestBody } from '../types/RequestBody'

const registerSchema = z.object({
  employee_number: z.string().min(1).max(100),
  rfc: z.string().length(13, 'RFC must be exactly 13 characters'),
  company_id: z.string().uuid('company_id must be a valid UUID'),
  tenant_id: z.string().uuid('tenant_id must be a valid UUID'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
})

export function validateBody(rawBody: string): RequestBody {
  if (!rawBody) throw new ValidationError('Request body is empty')

  let parsed: unknown
  try {
    parsed = JSON.parse(rawBody)
  } catch {
    throw new ValidationError('Invalid JSON body')
  }

  const result = registerSchema.safeParse(parsed)
  if (!result.success) {
    throw new ValidationError(JSON.stringify(result.error.flatten().fieldErrors))
  }

  return result.data
}
