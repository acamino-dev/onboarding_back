import { dynamoDb } from '../../../../../shared/db/dynamodb'
import { deleteOtpsByEmail } from '../../services/deleteOtpsByEmail'
import { OTP_ITEMS, TEST_OTP_EMAIL } from './helpers/constants'

const TABLE_NAME = process.env.OTP_TABLE_NAME ?? 'onboardingOtpDBdev'

describe('deleteOtpsByEmail integration', () => {
  it('happy path — deletes all OTPs for the given email', async () => {
    const now = Math.floor(Date.now() / 1000)
    await Promise.all([
      dynamoDb.put({
        TableName: TABLE_NAME,
        Item: { ...OTP_ITEMS.valid, expires_at: now + 900, created_at: now, used: false },
      }),
      dynamoDb.put({
        TableName: TABLE_NAME,
        Item: { ...OTP_ITEMS.used, expires_at: now + 900, created_at: now, used: true },
      }),
    ])

    await deleteOtpsByEmail(TEST_OTP_EMAIL, TABLE_NAME)

    const result = await dynamoDb.query({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': TEST_OTP_EMAIL },
    })
    expect(result.Items).toHaveLength(0)
  })

  it('resolves without error when no OTPs exist for email', async () => {
    await expect(deleteOtpsByEmail(TEST_OTP_EMAIL, TABLE_NAME)).resolves.toBeUndefined()
  })
})
