import { z } from 'zod'
import { ValidationError } from '../../../../shared/constants/errors'
import { MAX_CREDIT_AMOUNT, MIN_PLAZO_MONTHS } from '../../../../shared/constants/kyc'
import type { RequestBody } from '../types/RequestBody'

const schema = z.object({
  monto: z.number().positive().max(MAX_CREDIT_AMOUNT),
  plazo: z.number().int().min(MIN_PLAZO_MONTHS),
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
