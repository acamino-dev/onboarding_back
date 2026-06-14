import { NotFoundError, UnverifiedError } from '../../../../shared/constants/errors'
import { getDb } from '../../../../shared/db/client'
import type { User } from '../../../../shared/db/types'

export const findVerifiedUserByEmail = async (email: string): Promise<User> => {
  const db = await getDb()

  try {
    const user = await db.queryOne<User>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    )

    if (!user) {
      throw new NotFoundError('User not found', {
        file: 'lambdas/auth/resetPassword/services/findVerifiedUserByEmail.ts',
        function: 'findVerifiedUserByEmail',
        operation: 'find user by email',
        email,
      })
    }

    if (!user.otp_verified) {
      throw new UnverifiedError('User is not verified', {
        file: 'lambdas/auth/resetPassword/services/findVerifiedUserByEmail.ts',
        function: 'findVerifiedUserByEmail',
        operation: 'check otp_verified status',
        email,
      })
    }

    return user
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof UnverifiedError) throw error
    throw new Error(`Error on findVerifiedUserByEmail: ${error instanceof Error ? error.message : String(error)}`)
  }
}
