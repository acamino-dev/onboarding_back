import { DuplicatedError } from '../../../shared/constants/errors'
import { getDb } from '../../../shared/db/client'

export const checkUserExists = async (employeeId: string): Promise<void> => {
  try {
    const db = await getDb()

    const existing = await db.queryOne<{ id: string }>(
      'SELECT id FROM users WHERE employee_id = $1',
      [employeeId]
    )

    if (existing) throw new DuplicatedError('User already registered for this employee')
  } catch (e) {
    if (e instanceof DuplicatedError) throw e
    throw new Error(`Error on checkUserExists: ${e}`)
  }
}
