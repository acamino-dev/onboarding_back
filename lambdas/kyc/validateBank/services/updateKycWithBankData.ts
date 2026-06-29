import { KYC_STEPS } from '../../../../shared/constants/kyc'
import { dynamoDb } from '../../../../shared/db/dynamodb'

export const updateKycWithBankData = async (
  creditId: string,
  accountNumber: string,
  tableName: string
): Promise<void> => {
  try {
    await dynamoDb.update({
      TableName: tableName,
      Key: { creditId },
      UpdateExpression: 'SET #step = :step, bankAccount = :bankAccount',
      ConditionExpression: 'attribute_exists(creditId)',
      ExpressionAttributeNames: { '#step': 'step' },
      ExpressionAttributeValues: {
        ':step': KYC_STEPS.OTP,
        ':bankAccount': accountNumber,
      },
    })
  } catch (error) {
    throw new Error(
      `Error on updateKycWithBankData: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
