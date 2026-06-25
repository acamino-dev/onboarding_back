import { AuthError, NotFoundError } from '../../../../shared/constants/errors'
import { getDb } from '../../../../shared/db/client'

export const verifyUserRfc = async (userId: string, rfc: string): Promise<void> => {
  const db = await getDb()

  try {
    const row = await db.queryOne<{ rfc: string }>(
      `SELECT e.rfc
       FROM users u
       JOIN employees e ON u.employee_id = e.id
       WHERE u.id = $1
       AND e.is_active = TRUE`,
      [userId]
    )

    if (!row) {
      throw new NotFoundError('Employee not found for user', {
        file: 'lambdas/home/requestCreditHistory/services/verifyUserRfc.ts',
        function: 'verifyUserRfc',
        operation: 'find employee by userId',
        userId,
      })
    }

    if (row.rfc !== rfc) {
      throw new AuthError('RFC does not match user credentials', {
        file: 'lambdas/home/requestCreditHistory/services/verifyUserRfc.ts',
        function: 'verifyUserRfc',
        operation: 'verify rfc match',
        userId,
      })
    }
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthError) throw error
    throw new Error(`Error on verifyUserRfc: ${error instanceof Error ? error.message : String(error)}`)
  }
}
