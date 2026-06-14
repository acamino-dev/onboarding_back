import { AuthError, DuplicatedError, NotFoundError } from '../../../../../shared/constants/errors'
import { dynamoDb } from '../../../../../shared/db/dynamodb'
import { findOtp } from '../../services/findOtp'
import { TEST_OTP } from './helpers/constants'

const TABLE_NAME = process.env.OTP_TABLE_NAME as string
const now = Math.floor(Date.now() / 1000)

beforeAll(async () => {
  await dynamoDb.put({
    TableName: TABLE_NAME,
    Item: {
      email: TEST_OTP.email,
      otp_id: TEST_OTP.otp_id,
      code: TEST_OTP.code,
      expires_at: now + 900,
      created_at: now,
      used: false,
    },
  })
})

afterAll(async () => {
  await dynamoDb.delete({
    TableName: TABLE_NAME,
    Key: { email: TEST_OTP.email, otp_id: TEST_OTP.otp_id },
  })
})

describe('findOtp integration', () => {
  it('resolves when OTP is valid and not used', async () => {
    await expect(findOtp(TEST_OTP.email, TEST_OTP.code, TABLE_NAME)).resolves.toBeUndefined()
  })

  it('throws NotFoundError when code does not match', async () => {
    await expect(findOtp(TEST_OTP.email, '000000', TABLE_NAME)).rejects.toThrow(NotFoundError)
  })

  it('throws NotFoundError when email has no OTPs', async () => {
    await expect(findOtp('no.otps@company.com', TEST_OTP.code, TABLE_NAME)).rejects.toThrow(NotFoundError)
  })

  it('throws DuplicatedError when OTP is already used', async () => {
    const usedOtpId = 'f6a7b8c9-d0e1-2345-fabc-456789012345'
    await dynamoDb.put({
      TableName: TABLE_NAME,
      Item: {
        email: TEST_OTP.email,
        otp_id: usedOtpId,
        code: '111111',
        expires_at: now + 900,
        created_at: now,
        used: true,
      },
    })
    try {
      await expect(findOtp(TEST_OTP.email, '111111', TABLE_NAME)).rejects.toThrow(DuplicatedError)
    } finally {
      await dynamoDb.delete({ TableName: TABLE_NAME, Key: { email: TEST_OTP.email, otp_id: usedOtpId } })
    }
  })

  it('throws AuthError when OTP is expired', async () => {
    const expiredOtpId = 'a7b8c9d0-e1f2-3456-abcd-567890123456'
    await dynamoDb.put({
      TableName: TABLE_NAME,
      Item: {
        email: TEST_OTP.email,
        otp_id: expiredOtpId,
        code: '222222',
        expires_at: now - 1,
        created_at: now - 1000,
        used: false,
      },
    })
    try {
      await expect(findOtp(TEST_OTP.email, '222222', TABLE_NAME)).rejects.toThrow(AuthError)
    } finally {
      await dynamoDb.delete({ TableName: TABLE_NAME, Key: { email: TEST_OTP.email, otp_id: expiredOtpId } })
    }
  })
})
