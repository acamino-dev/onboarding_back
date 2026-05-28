import { eq } from 'drizzle-orm'
import { DuplicatedError } from '../../../shared/constants/errors'
import { getDb } from '../../../shared/db/client'
import { users } from '../../../shared/db/schema'

export async function checkUserExists(employeeId: string, connectionString: string): Promise<void> {
  try {
    const db = getDb(connectionString)

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.employeeId, employeeId))
      .limit(1)

    if (existing) throw new DuplicatedError('User already registered for this employee')
  } catch (e) {
    if (e instanceof DuplicatedError) throw e
    throw new Error(`Error on checkUserExists: ${e}`)
  }
}
