import { AuthError } from '../../../../../shared/constants/errors'
import { dynamoDb } from '../../../../../shared/db/dynamodb'
import { verifyAndDeleteOtp } from '../../services/verifyAndDeleteOtp'
import { TEST_CREDIT_ID, TEST_OTP, TEST_OTP_EXPIRED, TEST_PHONE_NUMBER } from './helpers/constants'

const TABLE_NAME = process.env.OTP_TABLE_NAME as string
const now = Math.floor(Date.now() / 1000)

beforeAll(async () => {
  await Promise.all([
    dynamoDb.put({
      TableName: TABLE_NAME,
      Item: { ...TEST_OTP, expires_at: now + 900, created_at: now },
    }),
    dynamoDb.put({
      TableName: TABLE_NAME,
      Item: { ...TEST_OTP_EXPIRED, expires_at: now - 1, created_at: now - 1000 },
    }),
  ])
})

afterAll(async () => {
  await Promise.all([
    dynamoDb.delete({
      TableName: TABLE_NAME,
      Key: { email: TEST_CREDIT_ID, otp_id: TEST_OTP.otp_id },
    }),
    dynamoDb.delete({
      TableName: TABLE_NAME,
      Key: { email: TEST_CREDIT_ID, otp_id: TEST_OTP_EXPIRED.otp_id },
    }),
  ])
})

describe('verifyAndDeleteOtp integration', () => {
  it('happy path — valid code deletes all OTPs and returns phoneNumber', async () => {
    await expect(
      verifyAndDeleteOtp(TEST_CREDIT_ID, TEST_OTP.code, TABLE_NAME)
    ).resolves.toEqual({ phoneNumber: TEST_PHONE_NUMBER })

    const remaining = await dynamoDb.query({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'email = :creditId',
      ExpressionAttributeValues: { ':creditId': TEST_CREDIT_ID },
    })
    expect(remaining.Items?.length ?? 0).toBe(0)
  })

  it('throws AuthError when code does not match', async () => {
    await expect(
      verifyAndDeleteOtp(TEST_CREDIT_ID, '0000', TABLE_NAME)
    ).rejects.toThrow(AuthError)
  })

  it('throws AuthError when OTP is expired', async () => {
    await expect(
      verifyAndDeleteOtp(TEST_CREDIT_ID, TEST_OTP_EXPIRED.code, TABLE_NAME)
    ).rejects.toThrow(AuthError)
  })
})
