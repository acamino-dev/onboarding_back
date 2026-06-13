import { NotFoundError } from '../../../../shared/constants/errors'
import { getDb } from '../../../../shared/db/client'

export type UserWithEmployee = {
  id: string
  email: string
  password_hash: string
  otp_verified: boolean
  company_id: string
  is_active: boolean
}

export const findUserByEmail = async (email: string): Promise<UserWithEmployee> => {
  const db = await getDb()

  try {
    const user = await db.queryOne<UserWithEmployee>(
      `SELECT u.id, u.email, u.password_hash, u.otp_verified, u.company_id, e.is_active
       FROM users u
       JOIN employees e ON u.employee_id = e.id
       WHERE u.email = $1`,
      [email]
    )

    if (!user) {
      throw new NotFoundError('User not found', {
        file: 'lambdas/auth/login/services/findUserByEmail.ts',
        function: 'findUserByEmail',
        operation: 'find user by email',
      })
    }

    return user
  } catch (error) {
    if (error instanceof NotFoundError) throw error
    throw new Error(`Error on findUserByEmail: ${error instanceof Error ? error.message : String(error)}`)
  }
}
