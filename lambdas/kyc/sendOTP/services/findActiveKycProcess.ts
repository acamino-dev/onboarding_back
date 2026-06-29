import { dynamoDb } from '../../../../shared/db/dynamodb'
import { NotFoundError } from '../../../../shared/constants/errors'

export const findActiveKycProcess = async (
  userId: string,
  tableName: string
): Promise<{ creditId: string }> => {
  try {
    const result = await dynamoDb.query({
      TableName: tableName,
      IndexName: 'userId-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
    })

    if (!result.Items || result.Items.length === 0) {
      throw new NotFoundError('No active KYC process found', {
        file: 'lambdas/kyc/sendOTP/services/findActiveKycProcess.ts',
        function: 'findActiveKycProcess',
        userId,
      })
    }

    return { creditId: result.Items[0]['creditId'] as string }
  } catch (error) {
    if (error instanceof NotFoundError) throw error
    throw new Error(`Error on findActiveKycProcess: ${error instanceof Error ? error.message : String(error)}`)
  }
}
