import { dynamoDb } from '../../../../shared/db/dynamodb'
import type { AnalysisResponse, ActiveCreditResponse, OfferResponse } from '../types/AnalysisResponse'
import type { ActiveCreditBalance } from '../types/CreditHistoryResult'
import type { CreditEngineResult } from '../creditEngine/creditEngine'

const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60

type CreditAnalysisItem = {
  userId: string
  analyzedAt: number
  type: 'active_credit' | 'offer'
  balance?: ActiveCreditBalance[]
  creditOffer?: CreditEngineResult
}

export const getCachedAnalysis = async (
  userId: string,
  tableName: string
): Promise<AnalysisResponse | null> => {
  try {
    const response = await dynamoDb.get({ TableName: tableName, Key: { userId } })

    const item = response.Item as CreditAnalysisItem | undefined
    if (!item) return null

    const now = Math.floor(Date.now() / 1000)
    if (now >= item.analyzedAt + THIRTY_DAYS_SECONDS) return null

    const analyzedAt = new Date(item.analyzedAt * 1000).toISOString()

    if (item.type === 'active_credit') {
      const result: ActiveCreditResponse = { type: 'active_credit', balance: item.balance!, analyzedAt }
      return result
    }

    const result: OfferResponse = { type: 'offer', creditOffer: item.creditOffer!, analyzedAt }
    return result
  } catch (error) {
    throw new Error(
      `Error on getCachedAnalysis: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
