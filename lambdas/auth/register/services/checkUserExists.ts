import { DuplicatedError } from '../../../../shared/constants/errors'
import { getDb } from '../../../../shared/db/client'

export const checkUserExists = async (email: string): Promise<void> => {
  const db = await getDb()

  try {
    const existing = await db.queryOne<{ id: string }>('SELECT id FROM users WHERE email = $1', [email])

    if (existing) {
      throw new DuplicatedError('Email already registered', {
        file: 'lambdas/auth/register/services/checkUserExists.ts',
        function: 'checkUserExists',
        operation: 'check email uniqueness',
        email,
      })
    }
  } catch (error) {
    if (error instanceof DuplicatedError) throw error
    throw new Error(`Error on checkUserExists: ${error instanceof Error ? error.message : String(error)}`)
  }
}
