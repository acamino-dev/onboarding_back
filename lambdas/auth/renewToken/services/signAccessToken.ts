import jwt from 'jsonwebtoken'
import { getSecret } from '../../../../shared/utils/secrets'

type JwtSecret = {
  secret: string
}

export const signAccessToken = async (
  userId: string,
  email: string,
  companyId: string,
  jwtSecretArn: string
): Promise<string> => {
  try {
    const secretString = await getSecret(jwtSecretArn)
    const { secret } = JSON.parse(secretString) as JwtSecret

    return jwt.sign({ sub: userId, email, companyId }, secret, { expiresIn: '1h' })
  } catch (error) {
    throw new Error(`Error on signAccessToken: ${error instanceof Error ? error.message : String(error)}`)
  }
}
