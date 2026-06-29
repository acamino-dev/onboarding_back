import { randomInt } from 'crypto'
import { RateLimitError } from '../../../../shared/constants/errors'
import { dynamoDb } from '../../../../shared/db/dynamodb'

export const createPhoneOtp = async (
  creditId: string,
  phoneNumber: string,
  tableName: string
): Promise<{ code: string }> => {
  try {
    const now = Math.floor(Date.now() / 1000)
    const twoMinutesAgo = now - 120

    const existing = await dynamoDb.query({
      TableName: tableName,
      KeyConditionExpression: 'email = :creditId',
      ExpressionAttributeValues: { ':creditId': creditId },
    })

    if (existing.Items && existing.Items.length > 0) {
      const recentOtp = existing.Items.find(
        (item) =>
          typeof item['created_at'] === 'number' && (item['created_at'] as number) > twoMinutesAgo
      )
      if (recentOtp) throw new RateLimitError('OTP already sent recently')
    }

    const code = String(randomInt(1000, 10000))
    const otpId = crypto.randomUUID()
    const expiresAt = now + 900

    await dynamoDb.put({
      TableName: tableName,
      Item: {
        email: creditId,
        otp_id: otpId,
        code,
        phoneNumber,
        expires_at: expiresAt,
        created_at: now,
        used: false,
      },
    })

    return { code }
  } catch (error) {
    if (error instanceof RateLimitError) throw error
    throw new Error(`Error on createPhoneOtp: ${error instanceof Error ? error.message : String(error)}`)
  }
}
