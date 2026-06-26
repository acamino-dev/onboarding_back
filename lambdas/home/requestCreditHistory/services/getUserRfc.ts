import { NotFoundError } from '../../../../shared/constants/errors'
import { getDb } from '../../../../shared/db/client'

export const getUserRfc = async (userId: string): Promise<string> => {
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
        file: 'lambdas/home/requestCreditHistory/services/getUserRfc.ts',
        function: 'getUserRfc',
        operation: 'find employee by userId',
        userId,
      })
    }

    return row.rfc
  } catch (error) {
    if (error instanceof NotFoundError) throw error
    throw new Error(`Error on getUserRfc: ${error instanceof Error ? error.message : String(error)}`)
  }
}
