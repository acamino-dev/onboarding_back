import { dynamoDb } from '../../../../shared/db/dynamodb'

export const deleteRefreshToken = async (
  tokenHash: string,
  tableName: string
): Promise<void> => {
  try {
    await dynamoDb.delete({
      TableName: tableName,
      Key: { token_hash: tokenHash },
    })
  } catch (error) {
    throw new Error(`Error on deleteRefreshToken: ${error instanceof Error ? error.message : String(error)}`)
  }
}
