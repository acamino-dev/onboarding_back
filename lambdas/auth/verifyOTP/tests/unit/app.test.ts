import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { lambdaHandler } from '../../app'
import { findOtp } from '../../services/findOtp'
import { findUserByEmail } from '../../services/findUserByEmail'
import { deleteOtpsByEmail } from '../../services/deleteOtpsByEmail'
import { markUserVerified } from '../../services/markUserVerified'
import { NotFoundError, DuplicatedError, AuthError } from '../../../../../shared/constants/errors'

jest.mock('../../services/findOtp')
jest.mock('../../services/findUserByEmail')
jest.mock('../../services/deleteOtpsByEmail')
jest.mock('../../services/markUserVerified')

const mockFindOtp = findOtp as jest.MockedFunction<typeof findOtp>
const mockFindUserByEmail = findUserByEmail as jest.MockedFunction<typeof findUserByEmail>
const mockDeleteOtpsByEmail = deleteOtpsByEmail as jest.MockedFunction<typeof deleteOtpsByEmail>
const mockMarkUserVerified = markUserVerified as jest.MockedFunction<typeof markUserVerified>

const baseEvent: Partial<APIGatewayProxyEventV2> = {
  body: JSON.stringify({ email: 'jane.doe@company.com', code: '482931' }),
  headers: { 'Content-Type': 'application/json' },
}

const mockUser = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  employee_id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  company_id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  email: 'jane.doe@company.com',
  password_hash: '$2b$10$hashedpassword',
  otp_verified: false,
  created_at: new Date('2024-01-15T10:00:00Z'),
  updated_at: new Date('2024-01-15T10:00:00Z'),
}

describe('verifyOTP', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.DB_SECRET_ID = 'onBoardingCredentialsDev'
    process.env.OTP_TABLE_NAME = 'onboardingOtpDBdev'

    mockFindOtp.mockResolvedValue(undefined)
    mockFindUserByEmail.mockResolvedValue(mockUser)
    mockDeleteOtpsByEmail.mockResolvedValue(undefined)
    mockMarkUserVerified.mockResolvedValue(undefined)
  })

  it('should return 200 when OTP is valid and user is verified successfully', async () => {
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

  it('should return 400 with errorCode 702 when email is missing', async () => {
    const result = await lambdaHandler({
      ...baseEvent,
      body: JSON.stringify({ code: '482931' }),
    } as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when code is missing', async () => {
    const result = await lambdaHandler({
      ...baseEvent,
      body: JSON.stringify({ email: 'jane.doe@company.com' }),
    } as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 705 when OTP is not found', async () => {
    mockFindOtp.mockRejectedValue(new NotFoundError('OTP not found'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(705)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 709 when OTP is already used', async () => {
    mockFindOtp.mockRejectedValue(new DuplicatedError('OTP already used'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(709)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 703 when OTP is expired', async () => {
    mockFindOtp.mockRejectedValue(new AuthError('OTP expired'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(703)
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

  it('should return 400 with errorCode 709 when user is already verified', async () => {
    mockFindUserByEmail.mockRejectedValue(new DuplicatedError('User already verified'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(709)
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

  it('should return 400 with errorCode 708 when findOtp throws a DB error', async () => {
    mockFindOtp.mockRejectedValue(new Error('connection timeout'))
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

  it('should return 400 with errorCode 708 when deleteOtpsByEmail throws a DB error', async () => {
    mockDeleteOtpsByEmail.mockRejectedValue(new Error('connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when markUserVerified throws a DB error', async () => {
    mockMarkUserVerified.mockRejectedValue(new Error('connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })
})
