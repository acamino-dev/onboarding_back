import { randomUUID } from 'crypto'
import { dynamoDb } from '../../../../shared/db/dynamodb'
import { KYC_STEPS, KYC_TTL_DAYS } from '../../../../shared/constants/kyc'

const TTL_SECONDS = KYC_TTL_DAYS * 24 * 60 * 60

export type KycProcess = {
  creditId: string
  step: typeof KYC_STEPS.CONDITIONS
}

export const createKycProcess = async (
  userId: string,
  monto: number,
  plazo: number,
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
        step: KYC_STEPS.CONDITIONS,
        monto,
        plazo,
        expires_at: now + TTL_SECONDS,
        created_at: now,
      },
    })

    return { creditId, step: KYC_STEPS.CONDITIONS }
  } catch (error) {
    throw new Error(
      `Error on createKycProcess: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
