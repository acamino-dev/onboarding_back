import { DuplicatedError, NotFoundError } from '../../../../shared/constants/errors'
import { getDb } from '../../../../shared/db/client'
import type { User } from '../../../../shared/db/types'

export const findUserByEmail = async (email: string): Promise<User> => {
  const db = await getDb()

  try {
    const user = await db.queryOne<User>('SELECT * FROM users WHERE email = $1', [email])

    if (!user) {
      throw new NotFoundError('User not found', {
        file: 'lambdas/auth/verifyOTP/services/findUserByEmail.ts',
        function: 'findUserByEmail',
        operation: 'find user by email',
        email,
      })
    }

    if (user.otp_verified) {
      throw new DuplicatedError('User already verified', {
        file: 'lambdas/auth/verifyOTP/services/findUserByEmail.ts',
        function: 'findUserByEmail',
        operation: 'check otp_verified status',
        email,
      })
    }

    return user
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof DuplicatedError) throw error
    throw new Error(
      `Error on findUserByEmail: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
