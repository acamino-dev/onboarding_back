import { z } from 'zod'
import { ValidationError } from '../../../../shared/constants/errors'
import type { RequestBody } from '../types/RequestBody'

const VOWELS = /[AEIOUÁÉÍÓÚÜ]/
const KEYBOARD_ROWS = ['QWERTYUIOP', 'ASDFGHJKLÑ', 'ZXCVBNM'] as const
const NOMBRE_ALLOWED = /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ ]+$/

const hasKeyboardWalk = (word: string): boolean => {
  for (const row of KEYBOARD_ROWS) {
    for (let i = 0; i <= word.length - 3; i++) {
      const a = row.indexOf(word[i])
      const b = row.indexOf(word[i + 1])
      const c = row.indexOf(word[i + 2])
      if (a === -1 || b === -1 || c === -1) continue
      if ((b === a + 1 && c === b + 1) || (b === a - 1 && c === b - 1)) return true
    }
  }
  return false
}

const isValidFullName = (nombre: string): boolean => {
  const trimmed = nombre.trim()
  if (!NOMBRE_ALLOWED.test(trimmed) || trimmed.length === 0) return false
  const words = trimmed.toUpperCase().split(/\s+/).filter(Boolean)
  if (words.length < 2) return false
  for (const word of words) {
    if (word.length < 2) return false
    if (!VOWELS.test(word)) return false
    if (/(.)\1{2,}/.test(word)) return false
    if (hasKeyboardWalk(word)) return false
  }
  return true
}

const referenceSchema = z.object({
  relation: z.string().min(1),
  fullName: z.string().min(1).refine(isValidFullName, { message: 'fullName is invalid' }),
  phoneNumber: z.string().regex(/^\d{10}$/, 'phoneNumber must be exactly 10 digits'),
})

const schema = z.object({
  clabe: z.string().regex(/^\d{18}$/, 'clabe must be exactly 18 numeric digits'),
  references: z.tuple([referenceSchema, referenceSchema]),
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
