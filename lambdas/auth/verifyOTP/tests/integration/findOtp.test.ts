import { AuthError, DuplicatedError, NotFoundError } from '../../../../../shared/constants/errors'
import { dynamoDb } from '../../../../../shared/db/dynamodb'
import { findOtp } from '../../services/findOtp'
import { OTP_ITEMS, TEST_OTP_EMAIL } from './helpers/constants'

const TABLE_NAME = process.env.OTP_TABLE_NAME ?? 'onboardingOtpDBdev'

const cleanupOtps = async (): Promise<void> => {
  const result = await dynamoDb.query({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: { ':email': TEST_OTP_EMAIL },
  })
  if (result.Items && result.Items.length > 0) {
    await Promise.all(
      result.Items.map((item) =>
        dynamoDb.delete({
          TableName: TABLE_NAME,
          Key: { email: item['email'], otp_id: item['otp_id'] },
        })
      )
    )
  }
}

describe('findOtp integration', () => {
  afterEach(cleanupOtps)

  it('happy path — resolves when code matches, is unused, and not expired', async () => {
    const now = Math.floor(Date.now() / 1000)
    await dynamoDb.put({
      TableName: TABLE_NAME,
      Item: {
        ...OTP_ITEMS.valid,
        expires_at: now + 900,
        created_at: now,
        used: false,
      },
    })

    await expect(findOtp(TEST_OTP_EMAIL, OTP_ITEMS.valid.code, TABLE_NAME)).resolves.toBeUndefined()
  })

  it('throws NotFoundError when no OTP matches the code', async () => {
    const now = Math.floor(Date.now() / 1000)
    await dynamoDb.put({
      TableName: TABLE_NAME,
      Item: {
        ...OTP_ITEMS.valid,
        expires_at: now + 900,
        created_at: now,
        used: false,
      },
    })

    await expect(findOtp(TEST_OTP_EMAIL, '000000', TABLE_NAME)).rejects.toThrow(NotFoundError)
  })

  it('throws NotFoundError when no OTPs exist for email', async () => {
    await expect(findOtp(TEST_OTP_EMAIL, OTP_ITEMS.valid.code, TABLE_NAME)).rejects.toThrow(
      NotFoundError
    )
  })

  it('throws DuplicatedError when OTP is already used', async () => {
    const now = Math.floor(Date.now() / 1000)
    await dynamoDb.put({
      TableName: TABLE_NAME,
      Item: {
        ...OTP_ITEMS.used,
        expires_at: now + 900,
        created_at: now,
        used: true,
      },
    })

    await expect(findOtp(TEST_OTP_EMAIL, OTP_ITEMS.used.code, TABLE_NAME)).rejects.toThrow(
      DuplicatedError
    )
  })

  it('throws AuthError when OTP is expired', async () => {
    const now = Math.floor(Date.now() / 1000)
    await dynamoDb.put({
      TableName: TABLE_NAME,
      Item: {
        ...OTP_ITEMS.expired,
        expires_at: now - 60,
        created_at: now - 960,
        used: false,
      },
    })

    await expect(findOtp(TEST_OTP_EMAIL, OTP_ITEMS.expired.code, TABLE_NAME)).rejects.toThrow(
      AuthError
    )
  })
})
