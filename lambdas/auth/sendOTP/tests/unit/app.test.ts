import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { lambdaHandler } from '../../app'
import { findUserByEmail } from '../../services/findUserByEmail'
import { createOtp } from '../../services/createOtp'
import { sendOtpEmail } from '../../services/sendOtpEmail'
import { NotFoundError, ForbiddenError, RateLimitError } from '../../../../../shared/constants/errors'

jest.mock('../../services/findUserByEmail')
jest.mock('../../services/createOtp')
jest.mock('../../services/sendOtpEmail')

const mockFindUserByEmail = findUserByEmail as jest.MockedFunction<typeof findUserByEmail>
const mockCreateOtp = createOtp as jest.MockedFunction<typeof createOtp>
const mockSendOtpEmail = sendOtpEmail as jest.MockedFunction<typeof sendOtpEmail>

const baseEvent: Partial<APIGatewayProxyEventV2> = {
  body: JSON.stringify({ email: 'john.doe@company.com' }),
  headers: { 'Content-Type': 'application/json' },
}

const mockUser = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  employee_id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  company_id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  email: 'john.doe@company.com',
  password_hash: '$2b$10$hashedpassword',
  otp_verified: false,
  created_at: new Date('2024-01-15T10:00:00Z'),
  updated_at: new Date('2024-01-15T10:00:00Z'),
}

describe('sendOTP', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.DB_SECRET_ID = 'onBoardingCredentialsDev'
    process.env.OTP_TABLE_NAME = 'onboardingOtpDBdev'
    process.env.SES_FROM_EMAIL = 'no-reply@apoyoenelcamino.com.mx'
    mockFindUserByEmail.mockResolvedValue(mockUser)
    mockCreateOtp.mockResolvedValue({ code: '482931' })
    mockSendOtpEmail.mockResolvedValue(undefined)
  })

  it('should return 200 with message when OTP is sent successfully', async () => {
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.message).toBe('OTP sent')
  })

  it('should return 400 with errorCode 702 when email format is invalid', async () => {
    const event = { ...baseEvent, body: JSON.stringify({ email: 'not-an-email' }) }
    const result = await lambdaHandler(event as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when body is empty', async () => {
    const event = { ...baseEvent, body: '' }
    const result = await lambdaHandler(event as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when email field is missing', async () => {
    const event = { ...baseEvent, body: JSON.stringify({}) }
    const result = await lambdaHandler(event as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 705 when user is not found', async () => {
    mockFindUserByEmail.mockRejectedValue(new NotFoundError('User not found'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(705)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 704 when user is already otp verified', async () => {
    mockFindUserByEmail.mockRejectedValue(new ForbiddenError('User already verified'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(704)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 707 when OTP was sent less than 1 minute ago', async () => {
    mockCreateOtp.mockRejectedValue(new RateLimitError('OTP already sent recently'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(707)
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

  it('should return 400 with errorCode 708 when findUserByEmail throws a DB error', async () => {
    mockFindUserByEmail.mockRejectedValue(new Error('connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when createOtp throws a DB error', async () => {
    mockCreateOtp.mockRejectedValue(new Error('connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when sendOtpEmail throws an error', async () => {
    mockSendOtpEmail.mockRejectedValue(new Error('connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })
})
