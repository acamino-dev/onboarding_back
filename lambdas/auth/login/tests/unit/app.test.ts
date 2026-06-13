import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { lambdaHandler } from '../../app'
import { findUserByEmail } from '../../services/findUserByEmail'
import { storeRefreshToken } from '../../services/storeRefreshToken'
import { signAccessToken } from '../../services/signAccessToken'
import { generateRefreshToken } from '../../utils/generateRefreshToken'
import { comparePassword } from '../../utils/comparePassword'

jest.mock('../../services/findUserByEmail')
jest.mock('../../services/storeRefreshToken')
jest.mock('../../services/signAccessToken')
jest.mock('../../utils/generateRefreshToken')
jest.mock('../../utils/comparePassword')

const mockFindUserByEmail = findUserByEmail as jest.MockedFunction<typeof findUserByEmail>
const mockStoreRefreshToken = storeRefreshToken as jest.MockedFunction<typeof storeRefreshToken>
const mockSignAccessToken = signAccessToken as jest.MockedFunction<typeof signAccessToken>
const mockGenerateRefreshToken = generateRefreshToken as jest.MockedFunction<typeof generateRefreshToken>
const mockComparePassword = comparePassword as jest.MockedFunction<typeof comparePassword>

const MOCK_USER = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  email: 'john.doe@company.com',
  password_hash: '$2b$10$hashedpasswordvalue',
  otp_verified: true,
  is_active: true,
  company_id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
}

const baseEvent: Partial<APIGatewayProxyEventV2> = {
  body: JSON.stringify({ email: 'john.doe@company.com', password: 'SecurePass123!' }),
  headers: { 'Content-Type': 'application/json' },
}

describe('login', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.DB_SECRET_ID = 'onBoardingCredentialsDev'
    process.env.JWT_SECRET_ARN = 'arn:aws:secretsmanager:us-east-1:123456789012:secret:onboardingJWTDev'
    process.env.REFRESH_TOKENS_TABLE_NAME = 'onboardingRefreshTokensDBDev'

    mockFindUserByEmail.mockResolvedValue(MOCK_USER)
    mockComparePassword.mockResolvedValue(undefined)
    mockGenerateRefreshToken.mockReturnValue({ rawToken: 'raw-uuid-token', tokenHash: 'sha256hashvalue' })
    mockStoreRefreshToken.mockResolvedValue(undefined)
    mockSignAccessToken.mockResolvedValue('jwt.access.token')
  })

  it('should return 200 with accessToken and set HttpOnly refreshToken cookie on valid credentials', async () => {
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.accessToken).toBe('jwt.access.token')
    expect(result.cookies).toEqual(
      expect.arrayContaining([
        expect.stringContaining('refreshToken=raw-uuid-token'),
        expect.stringContaining('HttpOnly'),
        expect.stringContaining('Secure'),
        expect.stringContaining('SameSite=Strict'),
      ])
    )
  })

  it('should return 400 with errorCode 702 when email is missing', async () => {
    const event = { ...baseEvent, body: JSON.stringify({ password: 'SecurePass123!' }) }
    const result = await lambdaHandler(event as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when password is missing', async () => {
    const event = { ...baseEvent, body: JSON.stringify({ email: 'john.doe@company.com' }) }
    const result = await lambdaHandler(event as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when body is invalid JSON', async () => {
    const event = { ...baseEvent, body: 'not-json' }
    const result = await lambdaHandler(event as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 705 when email is not found', async () => {
    const { NotFoundError } = await import('../../../../../shared/constants/errors')
    mockFindUserByEmail.mockRejectedValue(new NotFoundError('User not found'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(705)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 703 when password is incorrect', async () => {
    const { AuthError } = await import('../../../../../shared/constants/errors')
    mockComparePassword.mockRejectedValue(new AuthError('Invalid credentials'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(703)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 704 when employee is inactive', async () => {
    mockFindUserByEmail.mockResolvedValue({ ...MOCK_USER, is_active: false })
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(704)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 704 when OTP is not verified', async () => {
    mockFindUserByEmail.mockResolvedValue({ ...MOCK_USER, otp_verified: false })
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(704)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when DB_SECRET_ID is not set', async () => {
    delete process.env.DB_SECRET_ID
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when JWT_SECRET_ARN is not set', async () => {
    delete process.env.JWT_SECRET_ARN
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when REFRESH_TOKENS_TABLE_NAME is not set', async () => {
    delete process.env.REFRESH_TOKENS_TABLE_NAME
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when findUserByEmail throws a DB error', async () => {
    mockFindUserByEmail.mockRejectedValue(new Error('connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when storeRefreshToken throws a DB error', async () => {
    mockStoreRefreshToken.mockRejectedValue(new Error('connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when signAccessToken throws an error', async () => {
    mockSignAccessToken.mockRejectedValue(new Error('Secrets Manager unavailable'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })
})
