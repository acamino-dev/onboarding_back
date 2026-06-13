import { AuthError, DuplicatedError, NotFoundError } from '../../../../shared/constants/errors'
import { dynamoDb } from '../../../../shared/db/dynamodb'

export const findOtp = async (email: string, code: string, tableName: string): Promise<void> => {
  try {
    const result = await dynamoDb.query({
      TableName: tableName,
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email },
    })

    const items = result.Items ?? []
    const match = items.find((item) => item['code'] === code)

    if (!match) {
      throw new NotFoundError('OTP not found', {
        file: 'lambdas/auth/verifyOTP/services/findOtp.ts',
        function: 'findOtp',
        operation: 'find OTP by email and code',
        email,
      })
    }

    if (match['used'] === true) {
      throw new DuplicatedError('OTP already used', {
        file: 'lambdas/auth/verifyOTP/services/findOtp.ts',
        function: 'findOtp',
        operation: 'check OTP used status',
        email,
      })
    }

    const now = Math.floor(Date.now() / 1000)
    if (typeof match['expires_at'] === 'number' && match['expires_at'] < now) {
      throw new AuthError('OTP expired', {
        file: 'lambdas/auth/verifyOTP/services/findOtp.ts',
        function: 'findOtp',
        operation: 'check OTP expiry',
        email,
      })
    }
  } catch (error) {
    if (
      error instanceof NotFoundError ||
      error instanceof DuplicatedError ||
      error instanceof AuthError
    )
      throw error
    throw new Error(`Error on findOtp: ${error instanceof Error ? error.message : String(error)}`)
  }
}
