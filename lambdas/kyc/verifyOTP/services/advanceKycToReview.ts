import { KYC_STEPS } from '../../../../shared/constants/kyc'
import { dynamoDb } from '../../../../shared/db/dynamodb'

export const advanceKycToReview = async (
  creditId: string,
  phoneNumber: string,
  tableName: string
): Promise<void> => {
  try {
    await dynamoDb.update({
      TableName: tableName,
      Key: { creditId },
      UpdateExpression: 'SET #step = :step, phoneNumber = :phoneNumber',
      ConditionExpression: 'attribute_exists(creditId)',
      ExpressionAttributeNames: { '#step': 'step' },
      ExpressionAttributeValues: { ':step': KYC_STEPS.REVIEW, ':phoneNumber': phoneNumber },
    })
  } catch (error) {
    throw new Error(
      `Error on advanceKycToReview: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
