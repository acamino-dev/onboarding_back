import { dynamoDb } from '../../../../shared/db/dynamodb'
import { DuplicatedError } from '../../../../shared/constants/errors'

export const checkNoActiveKycProcess = async (userId: string, tableName: string): Promise<void> => {
  try {
    const result = await dynamoDb.query({
      TableName: tableName,
      IndexName: 'userId-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      Limit: 1,
    })

    if (result.Items && result.Items.length > 0) {
      throw new DuplicatedError('User already has an active KYC process', {
        file: 'lambdas/kyc/creditConditions/services/checkNoActiveKycProcess.ts',
        function: 'checkNoActiveKycProcess',
        userId,
      })
    }
  } catch (error) {
    if (error instanceof DuplicatedError) throw error
    throw new Error(
      `Error on checkNoActiveKycProcess: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
