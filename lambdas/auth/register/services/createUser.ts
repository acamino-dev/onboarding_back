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

  try {
    await db.query(
      'INSERT INTO users (employee_id, company_id, email, password_hash) VALUES ($1, $2, $3, $4)',
      [employee.id, employee.company_id, body.email, passwordHash]
    )
  } catch (error) {
    throw new Error(`Error on createUser: ${error instanceof Error ? error.message : String(error)}`)
  }
}
