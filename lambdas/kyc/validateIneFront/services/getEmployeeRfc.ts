import { NotFoundError } from '../../../../shared/constants/errors'
import { getDb } from '../../../../shared/db/client'

export const getEmployeeRfc = async (userId: string): Promise<string> => {
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
        file: 'lambdas/kyc/validateIneFront/services/getEmployeeRfc.ts',
        function: 'getEmployeeRfc',
        operation: 'find employee by userId',
        userId,
      })
    }

    return row.rfc
  } catch (error) {
    if (error instanceof NotFoundError) throw error
    throw new Error(`Error on getEmployeeRfc: ${error instanceof Error ? error.message : String(error)}`)
  }
}
