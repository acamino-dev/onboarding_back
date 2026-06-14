import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { lambdaHandler } from '../../app'
import { findVerifiedUserByEmail } from '../../services/findVerifiedUserByEmail'
import { findOtp } from '../../services/findOtp'
import { deleteOtpsByEmail } from '../../services/deleteOtpsByEmail'
import { updateUserPassword } from '../../services/updateUserPassword'
import { NotFoundError, UnverifiedError, DuplicatedError, AuthError } from '../../../../../shared/constants/errors'

jest.mock('../../services/findVerifiedUserByEmail')
jest.mock('../../services/findOtp')
jest.mock('../../services/deleteOtpsByEmail')
jest.mock('../../services/updateUserPassword')

const mockFindVerifiedUserByEmail = findVerifiedUserByEmail as jest.MockedFunction<typeof findVerifiedUserByEmail>
const mockFindOtp = findOtp as jest.MockedFunction<typeof findOtp>
const mockDeleteOtpsByEmail = deleteOtpsByEmail as jest.MockedFunction<typeof deleteOtpsByEmail>
const mockUpdateUserPassword = updateUserPassword as jest.MockedFunction<typeof updateUserPassword>

const baseEvent: Partial<APIGatewayProxyEventV2> = {
  body: JSON.stringify({ email: 'john.doe@company.com', code: '482931', password: 'NewSecure123' }),
  headers: { 'Content-Type': 'application/json' },
}

const mockUser = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  employee_id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  company_id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  email: 'john.doe@company.com',
  password_hash: '$2b$10$hashedpassword',
  otp_verified: true,
  created_at: new Date('2024-01-15T10:00:00Z'),
  updated_at: new Date('2024-01-15T10:00:00Z'),
}

describe('resetPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.DB_SECRET_ID = 'onBoardingCredentialsDev'
    process.env.OTP_TABLE_NAME = 'onboardingOtpDBdev'
    process.env.ONBOARDING_SALT_SECRET_ID = 'onboardingSaltDev'
    mockFindVerifiedUserByEmail.mockResolvedValue(mockUser)
    mockFindOtp.mockResolvedValue(undefined)
    mockDeleteOtpsByEmail.mockResolvedValue(undefined)
    mockUpdateUserPassword.mockResolvedValue(undefined)
  })

  it('should return 200 with message when password is reset successfully', async () => {
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.message).toBe('Password reset successfully')
  })

  it('should return 400 with errorCode 702 when body is empty', async () => {
    const event = { ...baseEvent, body: '' }
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

  it('should return 400 with errorCode 702 when email field is missing', async () => {
    const event = { ...baseEvent, body: JSON.stringify({ code: '482931', password: 'NewSecure123' }) }
    const result = await lambdaHandler(event as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when email format is invalid', async () => {
    const event = { ...baseEvent, body: JSON.stringify({ email: 'not-an-email', code: '482931', password: 'NewSecure123' }) }
    const result = await lambdaHandler(event as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when code field is missing', async () => {
    const event = { ...baseEvent, body: JSON.stringify({ email: 'john.doe@company.com', password: 'NewSecure123' }) }
    const result = await lambdaHandler(event as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when code is not 6 digits', async () => {
    const event = { ...baseEvent, body: JSON.stringify({ email: 'john.doe@company.com', code: '123', password: 'NewSecure123' }) }
    const result = await lambdaHandler(event as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when password field is missing', async () => {
    const event = { ...baseEvent, body: JSON.stringify({ email: 'john.doe@company.com', code: '482931' }) }
    const result = await lambdaHandler(event as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when password is shorter than 8 characters', async () => {
    const event = { ...baseEvent, body: JSON.stringify({ email: 'john.doe@company.com', code: '482931', password: 'Short1' }) }
    const result = await lambdaHandler(event as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 705 when user is not found', async () => {
    mockFindVerifiedUserByEmail.mockRejectedValue(new NotFoundError('User not found'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(705)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 711 when user is not verified', async () => {
    mockFindVerifiedUserByEmail.mockRejectedValue(new UnverifiedError('User is not verified'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(711)
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

  it('should return 400 with errorCode 708 when DB_SECRET_ID is not set', async () => {
    delete process.env.DB_SECRET_ID
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

  it('should return 400 with errorCode 708 when findVerifiedUserByEmail throws a DB error', async () => {
    mockFindVerifiedUserByEmail.mockRejectedValue(new Error('connection timeout'))
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

  it('should return 400 with errorCode 708 when deleteOtpsByEmail throws a DB error', async () => {
    mockDeleteOtpsByEmail.mockRejectedValue(new Error('connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when updateUserPassword throws a DB error', async () => {
    mockUpdateUserPassword.mockRejectedValue(new Error('connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })
})
