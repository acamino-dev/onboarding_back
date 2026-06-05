import bcrypt from 'bcrypt'
import { getDb } from '../../../shared/db/client'
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

    await db.query(
      'INSERT INTO users (employee_id, company_id, tenant_id, email, password_hash) VALUES ($1, $2, $3, $4, $5)',
      [employee.id, employee.companyId, body.tenant_id, employee.email, passwordHash]
    )
  } catch (e) {
    throw new Error(`Error on createUser: ${e}`)
  }
}
