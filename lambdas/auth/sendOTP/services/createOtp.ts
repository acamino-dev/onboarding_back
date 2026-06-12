import { randomInt } from 'crypto'
import { RateLimitError } from '../../../../shared/constants/errors'
import { dynamoDb } from '../../../../shared/db/dynamodb'

export const createOtp = async (email: string, tableName: string): Promise<{ code: string }> => {
  try {
    const now = Math.floor(Date.now() / 1000)
    const oneMinuteAgo = now - 60

    const existing = await dynamoDb.query({
      TableName: tableName,
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email },
    })

    if (existing.Items && existing.Items.length > 0) {
      const recentOtp = existing.Items.find(
        (item) => typeof item['created_at'] === 'number' && (item['created_at'] as number) > oneMinuteAgo
      )
      if (recentOtp) {
        throw new RateLimitError('OTP already sent recently')
      }
    }

    const code = String(randomInt(100000, 1000000))
    const otpId = crypto.randomUUID()
    const expiresAt = now + 900

    await dynamoDb.put({
      TableName: tableName,
      Item: {
        email,
        otp_id: otpId,
        code,
        expires_at: expiresAt,
        created_at: now,
        used: false,
      },
    })

    return { code }
  } catch (error) {
    if (error instanceof RateLimitError) throw error
    throw new Error(`Error on createOtp: ${error instanceof Error ? error.message : String(error)}`)
  }
}
