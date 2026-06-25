import { AuthError } from '../../../../shared/constants/errors'
import { getDb } from '../../../../shared/db/client'
import type { User } from '../../../../shared/db/types'

type UserInfo = {
  email: string
  companyId: string
}

export const findUser = async (userId: string): Promise<UserInfo> => {
  try {
    const db = await getDb()
    const user = await db.queryOne<User>(
      `SELECT u.id, u.email, u.company_id
       FROM users u
       JOIN employees e ON e.id = u.employee_id
       WHERE u.id = $1 AND e.is_active = TRUE AND u.otp_verified = TRUE`,
      [userId]
    )

    if (!user) {
      throw new AuthError('User not found or inactive', {
        file: 'lambdas/auth/renewToken/services/findUser.ts',
        function: 'findUser',
        operation: 'query user by id',
      })
    }

    return { email: user.email, companyId: user.company_id }
  } catch (error) {
    if (error instanceof AuthError) throw error
    throw new Error(`Error on findUser: ${error instanceof Error ? error.message : String(error)}`)
  }
}
