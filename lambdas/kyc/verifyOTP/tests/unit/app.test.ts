import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { lambdaHandler } from '../../app'
import { getKycByUserId } from '../../services/getKycByUserId'
import { verifyAndDeleteOtp } from '../../services/verifyAndDeleteOtp'
import { advanceKycToReview } from '../../services/advanceKycToReview'
import { AuthError, ForbiddenError, NotFoundError } from '../../../../../shared/constants/errors'

jest.mock('../../services/getKycByUserId')
jest.mock('../../services/verifyAndDeleteOtp')
jest.mock('../../services/advanceKycToReview')

const mockGetKycByUserId = getKycByUserId as jest.MockedFunction<typeof getKycByUserId>
const mockVerifyAndDeleteOtp = verifyAndDeleteOtp as jest.MockedFunction<typeof verifyAndDeleteOtp>
const mockAdvanceKycToReview = advanceKycToReview as jest.MockedFunction<typeof advanceKycToReview>

const baseEvent: Partial<APIGatewayProxyEventV2> = {
  body: JSON.stringify({ code: '4829' }),
  headers: { 'Content-Type': 'application/json' },
  requestContext: {
    authorizer: {
      lambda: { userId: 'user-abc-123' },
    },
  } as unknown as APIGatewayProxyEventV2['requestContext'],
}

const kycRecord = {
  creditId: 'credit-xyz-456',
  userId: 'user-abc-123',
  step: 'OTP',
  amount: 10000,
  term: 6,
  created_at: 1700000000,
  expires_at: 1700086400,
}

describe('verifyOTP', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.KYC_TABLE_NAME = 'onboardingKycDBDev'
    process.env.OTP_TABLE_NAME = 'onboardingOtpDBDev'
    mockGetKycByUserId.mockResolvedValue(kycRecord)
    mockVerifyAndDeleteOtp.mockResolvedValue({ phoneNumber: '5512345678' })
    mockAdvanceKycToReview.mockResolvedValue(undefined)
  })

  it('should return 200 with message when OTP is valid', async () => {
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.message).toBe('OTP verified')
  })

  it('should return 400 with errorCode 702 when body is missing', async () => {
    const result = await lambdaHandler({ ...baseEvent, body: undefined } as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when code is not 4 digits', async () => {
    const result = await lambdaHandler({
      ...baseEvent,
      body: JSON.stringify({ code: '12' }),
    } as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 703 when auth context is missing', async () => {
    const noAuthEvent = {
      ...baseEvent,
      requestContext: {} as unknown as APIGatewayProxyEventV2['requestContext'],
    }
    const result = await lambdaHandler(noAuthEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(703)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 705 when KYC process not found', async () => {
    mockGetKycByUserId.mockRejectedValue(new NotFoundError('KYC process not found'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(705)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 704 when KYC step is not OTP', async () => {
    mockGetKycByUserId.mockResolvedValue({ ...kycRecord, step: 'BANK' })
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(704)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 703 when OTP is invalid or expired', async () => {
    mockVerifyAndDeleteOtp.mockRejectedValue(new AuthError('Invalid or expired OTP'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(703)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when getKycByUserId throws a DB error', async () => {
    mockGetKycByUserId.mockRejectedValue(new Error('connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when verifyAndDeleteOtp throws a DB error', async () => {
    mockVerifyAndDeleteOtp.mockRejectedValue(new Error('connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when advanceKycToReview throws a DB error', async () => {
    mockAdvanceKycToReview.mockRejectedValue(new Error('connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })
})
