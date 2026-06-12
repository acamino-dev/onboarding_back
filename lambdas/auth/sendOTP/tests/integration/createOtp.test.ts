import { RateLimitError } from '../../../../../shared/constants/errors'
import { dynamoDb } from '../../../../../shared/db/dynamodb'
import { createOtp } from '../../services/createOtp'
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

describe('createOtp integration', () => {
  afterEach(cleanupOtps)

  it('happy path — creates OTP record and returns 6-digit code', async () => {
    const result = await createOtp(TEST_OTP_EMAIL, TABLE_NAME)
    expect(result.code).toMatch(/^\d{6}$/)

    const stored = await dynamoDb.query({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': TEST_OTP_EMAIL },
    })
    expect(stored.Items).toHaveLength(1)
    expect(stored.Items![0]['code']).toBe(result.code)
    expect(stored.Items![0]['used']).toBe(false)
    expect(stored.Items![0]['created_at']).toBeGreaterThan(0)
  })

  it('throws RateLimitError when OTP was created less than 1 minute ago', async () => {
    const now = Math.floor(Date.now() / 1000)
    await dynamoDb.put({
      TableName: TABLE_NAME,
      Item: {
        email: TEST_OTP_EMAIL,
        otp_id: OTP_ITEMS.existing.otp_id,
        code: '123456',
        expires_at: now + 900,
        created_at: now,
        used: false,
      },
    })

    await expect(createOtp(TEST_OTP_EMAIL, TABLE_NAME)).rejects.toThrow(RateLimitError)
  })

  it('creates new OTP when previous OTP is older than 1 minute', async () => {
    const now = Math.floor(Date.now() / 1000)
    const twoMinutesAgo = now - 120
    await dynamoDb.put({
      TableName: TABLE_NAME,
      Item: {
        email: TEST_OTP_EMAIL,
        otp_id: OTP_ITEMS.existing.otp_id,
        code: '654321',
        expires_at: now + 780,
        created_at: twoMinutesAgo,
        used: false,
      },
    })

    const result = await createOtp(TEST_OTP_EMAIL, TABLE_NAME)
    expect(result.code).toMatch(/^\d{6}$/)
  })
})
