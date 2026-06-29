import type { KycStep } from '../../../../shared/constants/kyc'
import { dynamoDb } from '../../../../shared/db/dynamodb'

export const updateKycStep = async (
  creditId: string,
  step: KycStep,
  tableName: string
): Promise<void> => {
  try {
    await dynamoDb.update({
      TableName: tableName,
      Key: { creditId },
      UpdateExpression: 'SET #step = :step',
      ExpressionAttributeNames: { '#step': 'step' },
      ExpressionAttributeValues: { ':step': step },
    })
  } catch (error) {
    throw new Error(
      `Error on updateKycStep: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
