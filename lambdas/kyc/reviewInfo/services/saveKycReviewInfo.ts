import { KYC_STEPS } from '../../../../shared/constants/kyc'
import { dynamoDb } from '../../../../shared/db/dynamodb'
import type { RequestBody } from '../types/RequestBody'

export const saveKycReviewInfo = async (
  creditId: string,
  body: RequestBody,
  tableName: string
): Promise<void> => {
  try {
    await dynamoDb.update({
      TableName: tableName,
      Key: { creditId },
      UpdateExpression: 'SET #step = :step, clabe = :clabe, #references = :references',
      ConditionExpression: 'attribute_exists(creditId)',
      ExpressionAttributeNames: { '#step': 'step', '#references': 'references' },
      ExpressionAttributeValues: {
        ':step': KYC_STEPS.STATUS,
        ':clabe': body.clabe,
        ':references': body.references,
      },
    })
  } catch (error) {
    throw new Error(
      `Error on saveKycReviewInfo: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
