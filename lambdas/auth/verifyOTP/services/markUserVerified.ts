import { getDb } from '../../../../shared/db/client'

export const markUserVerified = async (email: string): Promise<void> => {
  const db = await getDb()

  try {
    await db.query('UPDATE users SET otp_verified = TRUE, updated_at = NOW() WHERE email = $1', [
      email,
    ])
  } catch (error) {
    throw new Error(
      `Error on markUserVerified: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
