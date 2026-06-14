import { dynamoDb } from '../../../../shared/db/dynamodb'

export const deleteOtpsByEmail = async (email: string, tableName: string): Promise<void> => {
  try {
    const result = await dynamoDb.query({
      TableName: tableName,
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email },
    })

    const items = result.Items ?? []

    await Promise.all(
      items.map((item) =>
        dynamoDb.delete({
          TableName: tableName,
          Key: { email: item['email'], otp_id: item['otp_id'] },
        })
      )
    )
  } catch (error) {
    throw new Error(
      `Error on deleteOtpsByEmail: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
