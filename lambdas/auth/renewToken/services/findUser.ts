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
      'SELECT id, email, company_id FROM users WHERE id = $1',
      [userId]
    )

    if (!user) {
      throw new AuthError('User not found', {
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
