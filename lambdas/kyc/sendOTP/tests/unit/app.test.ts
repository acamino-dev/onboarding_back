import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { lambdaHandler } from '../../app'
import { findActiveKycProcess } from '../../services/findActiveKycProcess'
import { createPhoneOtp } from '../../services/createPhoneOtp'
import { sendOtpSms } from '../../services/sendOtpSms'
import { NotFoundError, RateLimitError } from '../../../../../shared/constants/errors'

jest.mock('../../services/findActiveKycProcess')
jest.mock('../../services/createPhoneOtp')
jest.mock('../../services/sendOtpSms')

const mockFindActiveKycProcess = findActiveKycProcess as jest.MockedFunction<typeof findActiveKycProcess>
const mockCreatePhoneOtp = createPhoneOtp as jest.MockedFunction<typeof createPhoneOtp>
const mockSendOtpSms = sendOtpSms as jest.MockedFunction<typeof sendOtpSms>

const baseEvent: Partial<APIGatewayProxyEventV2> = {
  body: JSON.stringify({ phoneNumber: '5512345678' }),
  headers: { 'Content-Type': 'application/json' },
  requestContext: {
    authorizer: { lambda: { userId: 'user-abc-123' } },
  } as unknown as APIGatewayProxyEventV2['requestContext'],
}

describe('kyc/sendOTP', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.KYC_TABLE_NAME = 'onboardingKycDBDev'
    process.env.OTP_TABLE_NAME = 'onboardingOtpDBDev'
    process.env.DEV_USER_ID = ''
    mockFindActiveKycProcess.mockResolvedValue({ creditId: 'credit-abc-123' })
    mockCreatePhoneOtp.mockResolvedValue({ code: '1234' })
    mockSendOtpSms.mockResolvedValue(undefined)
  })

  it('should return 200 with message when OTP sent successfully', async () => {
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.message).toBe('OTP sent')
  })

  it('should return 400 with errorCode 702 when phoneNumber is missing', async () => {
    const event = { ...baseEvent, body: JSON.stringify({}) }
    const result = await lambdaHandler(event as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when phoneNumber is not 10 digits', async () => {
    const event = { ...baseEvent, body: JSON.stringify({ phoneNumber: '123' }) }
    const result = await lambdaHandler(event as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when phoneNumber contains non-numeric characters', async () => {
    const event = { ...baseEvent, body: JSON.stringify({ phoneNumber: '551234567a' }) }
    const result = await lambdaHandler(event as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 703 when auth context is missing and DEV_USER_ID is not set', async () => {
    delete process.env.DEV_USER_ID
    const event = { ...baseEvent, requestContext: {} as unknown as APIGatewayProxyEventV2['requestContext'] }
    const result = await lambdaHandler(event as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(703)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 705 when no active KYC process found', async () => {
    mockFindActiveKycProcess.mockRejectedValue(new NotFoundError('No active KYC process'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(705)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 707 when OTP was sent less than 2 minutes ago', async () => {
    mockCreatePhoneOtp.mockRejectedValue(new RateLimitError('OTP already sent recently'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(707)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when KYC_TABLE_NAME is not set', async () => {
    delete process.env.KYC_TABLE_NAME
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when OTP_TABLE_NAME is not set', async () => {
    delete process.env.OTP_TABLE_NAME
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when findActiveKycProcess throws a DB error', async () => {
    mockFindActiveKycProcess.mockRejectedValue(new Error('connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when createPhoneOtp throws a DB error', async () => {
    mockCreatePhoneOtp.mockRejectedValue(new Error('connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when sendOtpSms throws an SNS error', async () => {
    mockSendOtpSms.mockRejectedValue(new Error('SNS publish failed'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })
})
