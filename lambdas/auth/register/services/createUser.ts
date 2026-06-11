import bcrypt from 'bcryptjs'
import { getDb } from '../../../../shared/db/client'
import { getSecret } from '../../../../shared/utils/secrets'
import type { RequestBody } from '../types/RequestBody'

type Employee = {
  id: string
  company_id: string
}

const BCRYPT_ROUNDS = 10

export const createUser = async (employee: Employee, body: RequestBody): Promise<void> => {
  const db = await getDb()
  const saltSecretId = process.env.ONBOARDING_SALT_SECRET_ID
  if (!saltSecretId) {
    throw new Error('ONBOARDING_SALT_SECRET_ID environment variable not set')
  }

  const saltSecretJson = await getSecret(saltSecretId)
  const saltSecret = JSON.parse(saltSecretJson) as { salt: string }
  const passwordWithSalt = `${body.password}${saltSecret.salt}`
  const passwordHash = await bcrypt.hash(passwordWithSalt, BCRYPT_ROUNDS)

  await db.query(
    'INSERT INTO users (employee_id, company_id, email, first_name, last_name, password_hash) VALUES ($1, $2, $3, $4, $5, $6)',
    [employee.id, employee.company_id, body.email, body.first_name, body.last_name, passwordHash]
  )
}
