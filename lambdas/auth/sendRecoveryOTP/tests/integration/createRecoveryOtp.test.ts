import { RateLimitError } from '../../../../../shared/constants/errors'
import { dynamoDb } from '../../../../../shared/db/dynamodb'
import { createRecoveryOtp } from '../../services/createRecoveryOtp'
import { OTP_ITEMS, TEST_RECOVERY_OTP_EMAIL } from './helpers/constants'

const TABLE_NAME = process.env.OTP_TABLE_NAME ?? 'onboardingOtpDBDev'

const cleanupOtps = async (): Promise<void> => {
  const result = await dynamoDb.query({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: { ':email': TEST_RECOVERY_OTP_EMAIL },
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

describe('createRecoveryOtp integration', () => {
  afterEach(cleanupOtps)

  it('happy path — creates OTP record and returns 6-digit code', async () => {
    const result = await createRecoveryOtp(TEST_RECOVERY_OTP_EMAIL, TABLE_NAME)
    expect(result.code).toMatch(/^\d{6}$/)

    const stored = await dynamoDb.query({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': TEST_RECOVERY_OTP_EMAIL },
    })
    expect(stored.Items).toHaveLength(1)
    expect(stored.Items![0]['code']).toBe(result.code)
    expect(stored.Items![0]['used']).toBe(false)
    expect(stored.Items![0]['created_at']).toBeGreaterThan(0)
  })

  it('throws RateLimitError when OTP was created less than 2 minutes ago', async () => {
    const now = Math.floor(Date.now() / 1000)
    await dynamoDb.put({
      TableName: TABLE_NAME,
      Item: {
        email: TEST_RECOVERY_OTP_EMAIL,
        otp_id: OTP_ITEMS.existing.otp_id,
        code: '123456',
        expires_at: now + 900,
        created_at: now,
        used: false,
      },
    })

    await expect(createRecoveryOtp(TEST_RECOVERY_OTP_EMAIL, TABLE_NAME)).rejects.toThrow(RateLimitError)
  })

  it('creates new OTP when previous OTP is older than 2 minutes', async () => {
    const now = Math.floor(Date.now() / 1000)
    const threeMinutesAgo = now - 180
    await dynamoDb.put({
      TableName: TABLE_NAME,
      Item: {
        email: TEST_RECOVERY_OTP_EMAIL,
        otp_id: OTP_ITEMS.existing.otp_id,
        code: '654321',
        expires_at: now + 720,
        created_at: threeMinutesAgo,
        used: false,
      },
    })

    const result = await createRecoveryOtp(TEST_RECOVERY_OTP_EMAIL, TABLE_NAME)
    expect(result.code).toMatch(/^\d{6}$/)
  })
})
