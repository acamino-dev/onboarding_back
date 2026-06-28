import { randomUUID } from 'crypto'
import { dynamoDb } from '../../../../shared/db/dynamodb'
import { KYC_STEPS } from '../../../../shared/constants/kyc'

export type KycProcess = {
  creditId: string
  step: typeof KYC_STEPS.INE_FRONT
}

export const createKycProcess = async (
  userId: string,
  amount: number,
  term: number,
  rate: number,
  tableName: string
): Promise<KycProcess> => {
  const creditId = randomUUID()
  const now = Math.floor(Date.now() / 1000)

  try {
    await dynamoDb.put({
      TableName: tableName,
      Item: {
        creditId,
        userId,
        step: KYC_STEPS.INE_FRONT,
        amount,
        term,
        rate,
        created_at: now,
      },
    })

    return { creditId, step: KYC_STEPS.INE_FRONT }
  } catch (error) {
    throw new Error(
      `Error on createKycProcess: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
