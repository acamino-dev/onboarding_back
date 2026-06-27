import { dynamoDb } from '../../../../shared/db/dynamodb'
import { NotFoundError, ForbiddenError } from '../../../../shared/constants/errors'

type CreditAnalysisItem = {
  userId: string
  analyzedAt: number
  type: 'active_credit' | 'offer'
  creditOffer?: {
    score: number
    breakdown: Record<string, number>
    offer: {
      amount: number
      tasa: number
      plazo: number
    }
  }
}

export type CreditOffer = {
  amount: number
  tasa: number
  plazo: number
}

export const getCreditOffer = async (userId: string, tableName: string): Promise<CreditOffer> => {
  try {
    const response = await dynamoDb.get({ TableName: tableName, Key: { userId } })
    const item = response.Item as CreditAnalysisItem | undefined

    if (!item) {
      throw new NotFoundError('Credit analysis not found for user', {
        file: 'lambdas/kyc/creditConditions/services/getCreditOffer.ts',
        function: 'getCreditOffer',
        userId,
      })
    }

    if (item.type === 'active_credit') {
      throw new ForbiddenError('User has an active credit and is not eligible for a new one', {
        file: 'lambdas/kyc/creditConditions/services/getCreditOffer.ts',
        function: 'getCreditOffer',
        userId,
      })
    }

    return item.creditOffer!.offer
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ForbiddenError) throw error
    throw new Error(
      `Error on getCreditOffer: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
