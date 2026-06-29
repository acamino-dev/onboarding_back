import { NotFoundError } from '../../../../shared/constants/errors'
import { dynamoDb } from '../../../../shared/db/dynamodb'
import type { KycRecord } from '../types/KycRecord'

export const getKycByUserId = async (userId: string, tableName: string): Promise<KycRecord> => {
  try {
    const result = await dynamoDb.query({
      TableName: tableName,
      IndexName: 'userId-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
    })

    if (!result.Items || result.Items.length === 0) {
      throw new NotFoundError('KYC process not found', {
        file: 'lambdas/kyc/verifyOTP/services/getKycByUserId.ts',
        function: 'getKycByUserId',
        operation: 'query userId-index',
        userId,
      })
    }

    const item = result.Items[0]

    return {
      creditId: item['creditId'] as string,
      userId: item['userId'] as string,
      step: item['step'] as string,
      s3Keys: item['s3Keys'] as Partial<Record<string, string>> | undefined,
      fullName: item['fullName'] as string | undefined,
      rfc: item['rfc'] as string | undefined,
      amount: item['amount'] as number,
      term: item['term'] as number,
      created_at: item['created_at'] as number,
      expires_at: item['expires_at'] as number,
    }
  } catch (error) {
    if (error instanceof NotFoundError) throw error
    throw new Error(
      `Error on getKycByUserId: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
