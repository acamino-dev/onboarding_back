import { dynamoDb } from '../../../../shared/db/dynamodb'
import type { AnalysisResponse } from '../types/AnalysisResponse'

export const storeAnalysis = async (
  userId: string,
  tableName: string,
  result: AnalysisResponse
): Promise<void> => {
  try {
    const analyzedAt = Math.floor(new Date(result.analyzedAt).getTime() / 1000)

    const item =
      result.type === 'active_credit'
        ? { userId, analyzedAt, type: result.type, balance: result.balance }
        : { userId, analyzedAt, type: result.type, creditOffer: result.creditOffer }

    await dynamoDb.put({ TableName: tableName, Item: item })
  } catch (error) {
    throw new Error(
      `Error on storeAnalysis: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
