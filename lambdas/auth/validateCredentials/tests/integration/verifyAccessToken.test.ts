import jwt from 'jsonwebtoken'
import { AuthError, TokenExpiredError } from '../../../../../shared/constants/errors'
import { getSecret } from '../../../../../shared/utils/secrets'
import { verifyAccessToken } from '../../services/verifyAccessToken'
import { SEEDED_USER_ID, TEST_COMPANY_ID } from './helpers/constants'

const JWT_SECRET_ARN = process.env.JWT_SECRET_ARN as string
const TEST_EMAIL = 'bob.smith@integrationtest.com'

describe('verifyAccessToken integration', () => {
  let jwtSecret: string

  beforeAll(async () => {
    const secretString = await getSecret(JWT_SECRET_ARN)
    const parsed = JSON.parse(secretString) as { secret: string }
    jwtSecret = parsed.secret
  })

  it('returns decoded payload when token is valid', async () => {
    const token = jwt.sign(
      { sub: SEEDED_USER_ID, email: TEST_EMAIL, companyId: TEST_COMPANY_ID },
      jwtSecret,
      { expiresIn: '1h' }
    )
    const result = await verifyAccessToken(token, JWT_SECRET_ARN)
    expect(result.userId).toBe(SEEDED_USER_ID)
    expect(result.email).toBe(TEST_EMAIL)
    expect(result.companyId).toBe(TEST_COMPANY_ID)
  })

  it('throws TokenExpiredError when token is expired', async () => {
    const token = jwt.sign(
      {
        sub: SEEDED_USER_ID,
        email: TEST_EMAIL,
        companyId: TEST_COMPANY_ID,
        exp: Math.floor(Date.now() / 1000) - 3600,
      },
      jwtSecret
    )
    await expect(verifyAccessToken(token, JWT_SECRET_ARN)).rejects.toThrow(TokenExpiredError)
  })

  it('throws AuthError when token has invalid signature', async () => {
    await expect(
      verifyAccessToken('invalid.jwt.token.value', JWT_SECRET_ARN)
    ).rejects.toThrow(AuthError)
  })

  it('throws wrapped Error when secret ARN is unreachable', async () => {
    const token = jwt.sign({ sub: SEEDED_USER_ID }, jwtSecret, { expiresIn: '1h' })
    await expect(
      verifyAccessToken(token, 'arn:aws:secretsmanager:us-east-1:000000000000:secret:nonExistentSecret')
    ).rejects.toThrow(/Error on verifyAccessToken/)
  })
})
