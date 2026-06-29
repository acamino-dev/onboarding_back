import { AuthError } from '../../../../shared/constants/errors'
import { dynamoDb } from '../../../../shared/db/dynamodb'

export const verifyAndDeleteOtp = async (
  creditId: string,
  code: string,
  tableName: string
): Promise<void> => {
  try {
    const now = Math.floor(Date.now() / 1000)

    const result = await dynamoDb.query({
      TableName: tableName,
      KeyConditionExpression: 'email = :creditId',
      ExpressionAttributeValues: { ':creditId': creditId },
    })

    const items = result.Items ?? []

    const valid = items.find(
      (item) =>
        item['code'] === code &&
        item['used'] === false &&
        typeof item['expires_at'] === 'number' &&
        (item['expires_at'] as number) > now
    )

    if (!valid) {
      throw new AuthError('Invalid or expired OTP')
    }

    await Promise.all(
      items.map((item) =>
        dynamoDb.delete({
          TableName: tableName,
          Key: { email: creditId, otp_id: item['otp_id'] as string },
        })
      )
    )
  } catch (error) {
    if (error instanceof AuthError) throw error
    throw new Error(
      `Error on verifyAndDeleteOtp: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
