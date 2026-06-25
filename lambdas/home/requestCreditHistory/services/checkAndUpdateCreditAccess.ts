import { dynamoDb } from '../../../../shared/db/dynamodb'

const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60

type AccessAllowed = { allowed: true }
type AccessDenied = { allowed: false; nextAvailableAt: string }
export type CreditAccessResult = AccessAllowed | AccessDenied

type CreditHistoryRequestItem = {
  userId: string
  lastRequestedAt: number
}

export const checkAndUpdateCreditAccess = async (
  userId: string,
  tableName: string
): Promise<CreditAccessResult> => {
  try {
    const response = await dynamoDb.get({
      TableName: tableName,
      Key: { userId },
    })

    const item = response.Item as CreditHistoryRequestItem | undefined

    if (item) {
      const now = Math.floor(Date.now() / 1000)
      const nextAvailableTimestamp = item.lastRequestedAt + THIRTY_DAYS_SECONDS

      if (now < nextAvailableTimestamp) {
        return {
          allowed: false,
          nextAvailableAt: new Date(nextAvailableTimestamp * 1000).toISOString(),
        }
      }
    }

    await dynamoDb.put({
      TableName: tableName,
      Item: {
        userId,
        lastRequestedAt: Math.floor(Date.now() / 1000),
      },
    })

    return { allowed: true }
  } catch (error) {
    throw new Error(
      `Error on checkAndUpdateCreditAccess: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
