import { dynamoDb } from '../../../../shared/db/dynamodb'

const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60

export const storeRefreshToken = async (
  tokenHash: string,
  userId: string,
  tableName: string
): Promise<void> => {
  const expiresAt = Math.floor(Date.now() / 1000) + SEVEN_DAYS_SECONDS

  try {
    await dynamoDb.put({
      TableName: tableName,
      Item: {
        token_hash: tokenHash,
        user_id: userId,
        expires_at: expiresAt,
      },
    })
  } catch (error) {
    throw new Error(`Error on storeRefreshToken: ${error instanceof Error ? error.message : String(error)}`)
  }
}
