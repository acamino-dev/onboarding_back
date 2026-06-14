import bcrypt from 'bcryptjs'
import { getDb } from '../../../../shared/db/client'
import { getSecret } from '../../../../shared/utils/secrets'

const BCRYPT_ROUNDS = 10

export const updateUserPassword = async (email: string, password: string): Promise<void> => {
  const saltSecretId = process.env.ONBOARDING_SALT_SECRET_ID
  if (!saltSecretId) throw new Error('ONBOARDING_SALT_SECRET_ID is not set')

  const saltSecretJson = await getSecret(saltSecretId)
  const saltSecret = JSON.parse(saltSecretJson) as { salt: string }
  const passwordWithSalt = `${password}${saltSecret.salt}`
  const passwordHash = await bcrypt.hash(passwordWithSalt, BCRYPT_ROUNDS)

  const db = await getDb()

  try {
    await db.query('UPDATE users SET password_hash = $1 WHERE email = $2', [passwordHash, email])
  } catch (error) {
    throw new Error(
      `Error on updateUserPassword: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
