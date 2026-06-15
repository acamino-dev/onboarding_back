import { AuthError } from '../../../../shared/constants/errors'
import { dynamoDb } from '../../../../shared/db/dynamodb'

type RefreshToken = {
  token_hash: string
  user_id: string
  expires_at: number
}

export const findRefreshToken = async (
  tokenHash: string,
  tableName: string
): Promise<RefreshToken> => {
  try {
    const result = await dynamoDb.get({
      TableName: tableName,
      Key: { token_hash: tokenHash },
    })

    if (!result.Item) {
      throw new AuthError('Refresh token not found', {
        file: 'lambdas/auth/validateCredentials/services/findRefreshToken.ts',
        function: 'findRefreshToken',
        operation: 'get refresh token from DynamoDB',
      })
    }

    const token = result.Item as RefreshToken

    if (token.expires_at < Math.floor(Date.now() / 1000)) {
      throw new AuthError('Refresh token expired', {
        file: 'lambdas/auth/validateCredentials/services/findRefreshToken.ts',
        function: 'findRefreshToken',
        operation: 'validate refresh token expiry',
      })
    }

    return token
  } catch (error) {
    if (error instanceof AuthError) throw error
    throw new Error(`Error on findRefreshToken: ${error instanceof Error ? error.message : String(error)}`)
  }
}
