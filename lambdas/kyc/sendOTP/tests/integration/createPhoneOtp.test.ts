import { RateLimitError } from '../../../../../shared/constants/errors'
import { dynamoDb } from '../../../../../shared/db/dynamodb'
import { createPhoneOtp } from '../../services/createPhoneOtp'
import { OTP_TABLE, TEST_CREDIT_ID } from './helpers/constants'

afterEach(async () => {
  const existing = await dynamoDb.query({
    TableName: OTP_TABLE,
    KeyConditionExpression: 'email = :creditId',
    ExpressionAttributeValues: { ':creditId': TEST_CREDIT_ID },
  })
  if (existing.Items) {
    await Promise.all(
      existing.Items.map((item) =>
        dynamoDb.delete({
          TableName: OTP_TABLE,
          Key: { email: TEST_CREDIT_ID, otp_id: item['otp_id'] as string },
        })
      )
    )
  }
})

describe('createPhoneOtp integration', () => {
  it('creates OTP and returns 4-digit code', async () => {
    const result = await createPhoneOtp(TEST_CREDIT_ID, OTP_TABLE)
    expect(result.code).toMatch(/^\d{4}$/)

    const stored = await dynamoDb.query({
      TableName: OTP_TABLE,
      KeyConditionExpression: 'email = :creditId',
      ExpressionAttributeValues: { ':creditId': TEST_CREDIT_ID },
    })
    expect(stored.Items).toHaveLength(1)
    expect(stored.Items![0]['code']).toBe(result.code)
    expect(stored.Items![0]['used']).toBe(false)
  })

  it('throws RateLimitError when OTP was created less than 2 minutes ago', async () => {
    await createPhoneOtp(TEST_CREDIT_ID, OTP_TABLE)
    await expect(createPhoneOtp(TEST_CREDIT_ID, OTP_TABLE)).rejects.toThrow(RateLimitError)
  })
})
