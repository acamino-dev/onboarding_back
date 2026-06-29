import { dynamoDb } from '../../../../shared/db/dynamodb'

export const saveS3Key = async (
  creditId: string,
  step: string,
  s3Key: string,
  tableName: string
): Promise<void> => {
  try {
    await dynamoDb.update({
      TableName: tableName,
      Key: { creditId },
      UpdateExpression: 'SET s3Keys.#step = :s3Key',
      ExpressionAttributeNames: { '#step': step },
      ExpressionAttributeValues: { ':s3Key': s3Key },
    })
  } catch (error) {
    throw new Error(`Error on saveS3Key: ${error instanceof Error ? error.message : String(error)}`)
  }
}
