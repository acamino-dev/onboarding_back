import { DuplicatedError } from '../../../../shared/constants/errors'
import { getDb } from '../../../../shared/db/client'

export const checkUserExists = async (email: string): Promise<void> => {
  const db = await getDb()

  const existing = await db.queryOne<{ id: string }>('SELECT id FROM users WHERE email = $1', [email])

  if (existing) {
    throw new DuplicatedError('Email already registered', {
      file: 'lambdas/auth/register/services/checkUserExists.ts',
      function: 'checkUserExists',
      operation: 'check email uniqueness',
      email,
    })
  }
}
