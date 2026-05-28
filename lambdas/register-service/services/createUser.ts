import bcrypt from 'bcrypt'
import { getDb } from '../../../shared/db/client'
import { users } from '../../../shared/db/schema'
import type { RequestBody } from '../types/RequestBody'

type Employee = {
  id: string
  email: string
  companyId: string
}

const BCRYPT_ROUNDS = 10

export async function createUser(
  employee: Employee,
  body: RequestBody,
  connectionString: string
): Promise<void> {
  try {
    const db = getDb(connectionString)
    const passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS)

    await db.insert(users).values({
      employeeId: employee.id,
      companyId: employee.companyId,
      tenantId: body.tenant_id,
      email: employee.email,
      passwordHash,
    })
  } catch (e) {
    throw new Error(`Error on createUser: ${e}`)
  }
}
