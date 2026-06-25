import type { APIGatewayRequestAuthorizerEventV2 } from 'aws-lambda'
import { lambdaHandler } from '../../app'
import { verifyAccessToken } from '../../services/verifyAccessToken'
import { findRefreshToken } from '../../services/findRefreshToken'

jest.mock('../../services/verifyAccessToken')
jest.mock('../../services/findRefreshToken')

const mockVerifyAccessToken = verifyAccessToken as jest.MockedFunction<typeof verifyAccessToken>
const mockFindRefreshToken = findRefreshToken as jest.MockedFunction<typeof findRefreshToken>

const baseEvent: Partial<APIGatewayRequestAuthorizerEventV2> = {
  headers: { authorization: 'Bearer valid.jwt.token' },
  cookies: ['refreshToken=550e8400-e29b-41d4-a716-446655440000'],
}

describe('validateCredentials', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.JWT_SECRET_ARN = 'arn:aws:secretsmanager:us-east-1:123456789012:secret:onboardingJWTDev'
    process.env.REFRESH_TOKENS_TABLE_NAME = 'onboardingRefreshTokensDBDev'

    mockVerifyAccessToken.mockResolvedValue({
      userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      email: 'jane.doe@company.com',
      companyId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    })
    mockFindRefreshToken.mockResolvedValue({
      token_hash: 'abc123hashvalue',
      user_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    })
  })

  it('should return isAuthorized true with context when credentials are valid', async () => {
    const result = await lambdaHandler(baseEvent as APIGatewayRequestAuthorizerEventV2)
    expect(result.isAuthorized).toBe(true)
    expect(result.context?.userId).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    expect(result.context?.email).toBe('jane.doe@company.com')
    expect(result.context?.companyId).toBe('b2c3d4e5-f6a7-8901-bcde-f12345678901')
  })

  it('should return isAuthorized false when Authorization header is missing', async () => {
    const result = await lambdaHandler({ ...baseEvent, headers: {} } as APIGatewayRequestAuthorizerEventV2)
    expect(result.isAuthorized).toBe(false)
    expect(result.context).toBeUndefined()
  })

  it('should return isAuthorized false when Authorization header is malformed', async () => {
    const result = await lambdaHandler({
      ...baseEvent,
      headers: { authorization: 'NotBearer token123' },
    } as APIGatewayRequestAuthorizerEventV2)
    expect(result.isAuthorized).toBe(false)
    expect(result.context).toBeUndefined()
  })

  it('should return isAuthorized false when refreshToken cookie is missing', async () => {
    const result = await lambdaHandler({ ...baseEvent, cookies: [] } as APIGatewayRequestAuthorizerEventV2)
    expect(result.isAuthorized).toBe(false)
    expect(result.context).toBeUndefined()
  })

  it('should return isAuthorized false when JWT has invalid signature', async () => {
    const { AuthError } = await import('../../../../../shared/constants/errors')
    mockVerifyAccessToken.mockRejectedValue(new AuthError('Invalid token'))
    const result = await lambdaHandler(baseEvent as APIGatewayRequestAuthorizerEventV2)
    expect(result.isAuthorized).toBe(false)
  })

  it('should return isAuthorized false when JWT is expired', async () => {
    const { TokenExpiredError } = await import('../../../../../shared/constants/errors')
    mockVerifyAccessToken.mockRejectedValue(new TokenExpiredError('Token expired'))
    const result = await lambdaHandler(baseEvent as APIGatewayRequestAuthorizerEventV2)
    expect(result.isAuthorized).toBe(false)
  })

  it('should return isAuthorized false when access token userId does not match refresh token user_id', async () => {
    mockFindRefreshToken.mockResolvedValue({
      token_hash: 'abc123hashvalue',
      user_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    })
    const result = await lambdaHandler(baseEvent as APIGatewayRequestAuthorizerEventV2)
    expect(result.isAuthorized).toBe(false)
  })

  it('should return isAuthorized false when refresh token is not found', async () => {
    const { AuthError } = await import('../../../../../shared/constants/errors')
    mockFindRefreshToken.mockRejectedValue(new AuthError('Refresh token not found'))
    const result = await lambdaHandler(baseEvent as APIGatewayRequestAuthorizerEventV2)
    expect(result.isAuthorized).toBe(false)
  })

  it('should return isAuthorized false when refresh token is expired', async () => {
    const { AuthError } = await import('../../../../../shared/constants/errors')
    mockFindRefreshToken.mockRejectedValue(new AuthError('Refresh token expired'))
    const result = await lambdaHandler(baseEvent as APIGatewayRequestAuthorizerEventV2)
    expect(result.isAuthorized).toBe(false)
  })

  it('should return isAuthorized false when JWT_SECRET_ARN is not set', async () => {
    delete process.env.JWT_SECRET_ARN
    const result = await lambdaHandler(baseEvent as APIGatewayRequestAuthorizerEventV2)
    expect(result.isAuthorized).toBe(false)
  })

  it('should return isAuthorized false when REFRESH_TOKENS_TABLE_NAME is not set', async () => {
    delete process.env.REFRESH_TOKENS_TABLE_NAME
    const result = await lambdaHandler(baseEvent as APIGatewayRequestAuthorizerEventV2)
    expect(result.isAuthorized).toBe(false)
  })

  it('should return isAuthorized false when verifyAccessToken throws a generic error', async () => {
    mockVerifyAccessToken.mockRejectedValue(new Error('connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayRequestAuthorizerEventV2)
    expect(result.isAuthorized).toBe(false)
  })

  it('should return isAuthorized false when findRefreshToken throws a generic error', async () => {
    mockFindRefreshToken.mockRejectedValue(new Error('connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayRequestAuthorizerEventV2)
    expect(result.isAuthorized).toBe(false)
  })
})
