import { AuthError } from '../../../../shared/constants/errors'
import { dynamoDb } from '../../../../shared/db/dynamodb'

const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60

export const rotateRefreshToken = async (
  oldTokenHash: string,
  newTokenHash: string,
  userId: string,
  tableName: string
): Promise<void> => {
  const expiresAt = Math.floor(Date.now() / 1000) + SEVEN_DAYS_SECONDS

  try {
    await dynamoDb.transactWrite({
      TransactItems: [
        {
          Delete: {
            TableName: tableName,
            Key: { token_hash: oldTokenHash },
            ConditionExpression: 'attribute_exists(token_hash)',
          },
        },
        {
          Put: {
            TableName: tableName,
            Item: {
              token_hash: newTokenHash,
              user_id: userId,
              expires_at: expiresAt,
            },
            ConditionExpression: 'attribute_not_exists(token_hash)',
          },
        },
      ],
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'TransactionCanceledException') {
      throw new AuthError('Refresh token already used', {
        file: 'lambdas/auth/renewToken/services/rotateRefreshToken.ts',
        function: 'rotateRefreshToken',
        operation: 'atomic token rotation',
      })
    }
    throw new Error(`Error on rotateRefreshToken: ${error instanceof Error ? error.message : String(error)}`)
  }
}
