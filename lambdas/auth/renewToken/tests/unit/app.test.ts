import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { lambdaHandler } from '../../app'
import { decodeExpiredToken } from '../../services/decodeExpiredToken'
import { findRefreshToken } from '../../services/findRefreshToken'
import { deleteRefreshToken } from '../../services/deleteRefreshToken'
import { storeRefreshToken } from '../../services/storeRefreshToken'
import { signAccessToken } from '../../services/signAccessToken'
import { generateRefreshToken } from '../../utils/generateRefreshToken'

jest.mock('../../services/decodeExpiredToken')
jest.mock('../../services/findRefreshToken')
jest.mock('../../services/deleteRefreshToken')
jest.mock('../../services/storeRefreshToken')
jest.mock('../../services/signAccessToken')
jest.mock('../../utils/generateRefreshToken')

const mockDecodeExpiredToken = decodeExpiredToken as jest.MockedFunction<typeof decodeExpiredToken>
const mockFindRefreshToken = findRefreshToken as jest.MockedFunction<typeof findRefreshToken>
const mockDeleteRefreshToken = deleteRefreshToken as jest.MockedFunction<typeof deleteRefreshToken>
const mockStoreRefreshToken = storeRefreshToken as jest.MockedFunction<typeof storeRefreshToken>
const mockSignAccessToken = signAccessToken as jest.MockedFunction<typeof signAccessToken>
const mockGenerateRefreshToken = generateRefreshToken as jest.MockedFunction<typeof generateRefreshToken>

const baseEvent: Partial<APIGatewayProxyEventV2> = {
  headers: { authorization: 'Bearer expired.jwt.token' },
  cookies: ['refreshToken=550e8400-e29b-41d4-a716-446655440000'],
}

describe('renewToken', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.DB_SECRET_ID = 'onBoardingCredentialsDev'
    process.env.JWT_SECRET_ARN = 'arn:aws:secretsmanager:us-east-1:123456789012:secret:onboardingJWTDev'
    process.env.REFRESH_TOKENS_TABLE_NAME = 'onboardingRefreshTokensDBDev'

    mockDecodeExpiredToken.mockResolvedValue({
      userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      email: 'jane.doe@company.com',
      companyId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    })
    mockFindRefreshToken.mockResolvedValue({
      token_hash: 'oldhashvalue123',
      user_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      expires_at: Math.floor(Date.now() / 1000) + 604800,
    })
    mockDeleteRefreshToken.mockResolvedValue(undefined)
    mockGenerateRefreshToken.mockReturnValue({ rawToken: 'new-raw-uuid-token', tokenHash: 'newhashvalue456' })
    mockStoreRefreshToken.mockResolvedValue(undefined)
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
    expect(mockDeleteRefreshToken).toHaveBeenCalledTimes(1)
    expect(mockStoreRefreshToken).toHaveBeenCalledWith('newhashvalue456', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'onboardingRefreshTokensDBDev')
  })

  it('should return 400 with errorCode 702 when Authorization header is missing', async () => {
    const result = await lambdaHandler({ ...baseEvent, headers: {} } as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when Authorization header is malformed', async () => {
    const result = await lambdaHandler({ ...baseEvent, headers: { authorization: 'NotBearer token' } } as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when refreshToken cookie is missing', async () => {
    const result = await lambdaHandler({ ...baseEvent, cookies: [] } as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 703 when accessToken has invalid signature', async () => {
    const { AuthError } = await import('../../../../../shared/constants/errors')
    mockDecodeExpiredToken.mockRejectedValue(new AuthError('Invalid token signature'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(703)
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

  it('should return 400 with errorCode 708 when decodeExpiredToken throws a DB error', async () => {
    mockDecodeExpiredToken.mockRejectedValue(new Error('connection timeout'))
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

  it('should return 400 with errorCode 708 when deleteRefreshToken throws a DB error', async () => {
    mockDeleteRefreshToken.mockRejectedValue(new Error('connection timeout'))
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
