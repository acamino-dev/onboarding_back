import { createHash } from 'crypto'
import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { lambdaHandler } from '../../app'
import { findRefreshToken } from '../../services/findRefreshToken'
import { findUser } from '../../services/findUser'
import { rotateRefreshToken } from '../../services/rotateRefreshToken'
import { signAccessToken } from '../../services/signAccessToken'
import { generateRefreshToken } from '../../utils/generateRefreshToken'

jest.mock('../../services/findRefreshToken')
jest.mock('../../services/findUser')
jest.mock('../../services/rotateRefreshToken')
jest.mock('../../services/signAccessToken')
jest.mock('../../utils/generateRefreshToken')

const mockFindRefreshToken = findRefreshToken as jest.MockedFunction<typeof findRefreshToken>
const mockFindUser = findUser as jest.MockedFunction<typeof findUser>
const mockRotateRefreshToken = rotateRefreshToken as jest.MockedFunction<typeof rotateRefreshToken>
const mockSignAccessToken = signAccessToken as jest.MockedFunction<typeof signAccessToken>
const mockGenerateRefreshToken = generateRefreshToken as jest.MockedFunction<typeof generateRefreshToken>

const RAW_REFRESH_TOKEN = '550e8400-e29b-41d4-a716-446655440000'
const OLD_TOKEN_HASH = createHash('sha256').update(RAW_REFRESH_TOKEN).digest('hex')

const baseEvent: Partial<APIGatewayProxyEventV2> = {
  headers: {},
  cookies: [`refreshToken=${RAW_REFRESH_TOKEN}`],
}

describe('renewToken', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.DB_SECRET_ID = 'onBoardingCredentialsDev'
    process.env.JWT_SECRET_ARN = 'arn:aws:secretsmanager:us-east-1:123456789012:secret:onboardingJWTDev'
    process.env.REFRESH_TOKENS_TABLE_NAME = 'onboardingRefreshTokensDBDev'

    mockFindRefreshToken.mockResolvedValue({
      token_hash: OLD_TOKEN_HASH,
      user_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      expires_at: Math.floor(Date.now() / 1000) + 604800,
    })
    mockFindUser.mockResolvedValue({
      email: 'jane.doe@company.com',
      companyId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    })
    mockGenerateRefreshToken.mockReturnValue({ rawToken: 'new-raw-uuid-token', tokenHash: 'newhashvalue456' })
    mockRotateRefreshToken.mockResolvedValue(undefined)
    mockSignAccessToken.mockResolvedValue('new.jwt.access.token')
  })

  it('should return 200 with new accessToken and rotated HttpOnly refreshToken cookie', async () => {
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.accessToken).toBe('new.jwt.access.token')
    expect(result.cookies).toEqual(
      expect.arrayContaining([
        expect.stringContaining('refreshToken=new-raw-uuid-token'),
        expect.stringContaining('HttpOnly'),
        expect.stringContaining('Secure'),
        expect.stringContaining('SameSite=Strict'),
      ])
    )
    expect(mockRotateRefreshToken).toHaveBeenCalledWith(
      OLD_TOKEN_HASH,
      'newhashvalue456',
      'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      'onboardingRefreshTokensDBDev'
    )
  })

  it('should return 400 with errorCode 702 when refreshToken cookie is missing', async () => {
    const result = await lambdaHandler({ ...baseEvent, cookies: [] } as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 703 when refreshToken is not found in DynamoDB', async () => {
    const { AuthError } = await import('../../../../../shared/constants/errors')
    mockFindRefreshToken.mockRejectedValue(new AuthError('Refresh token not found'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(703)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 703 when refreshToken is expired', async () => {
    const { AuthError } = await import('../../../../../shared/constants/errors')
    mockFindRefreshToken.mockRejectedValue(new AuthError('Refresh token expired'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(703)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 703 when user is not found', async () => {
    const { AuthError } = await import('../../../../../shared/constants/errors')
    mockFindUser.mockRejectedValue(new AuthError('User not found'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(703)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 703 when refresh token was already used (concurrent reuse)', async () => {
    const { AuthError } = await import('../../../../../shared/constants/errors')
    mockRotateRefreshToken.mockRejectedValue(new AuthError('Refresh token already used'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(703)
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

  it('should return 400 with errorCode 708 when findRefreshToken throws a DB error', async () => {
    mockFindRefreshToken.mockRejectedValue(new Error('connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when findUser throws a DB error', async () => {
    mockFindUser.mockRejectedValue(new Error('Error on findUser: connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when rotateRefreshToken throws a DB error', async () => {
    mockRotateRefreshToken.mockRejectedValue(new Error('Error on rotateRefreshToken: connection timeout'))
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
