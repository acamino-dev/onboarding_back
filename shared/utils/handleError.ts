import crypto from 'crypto'
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { AuthError, DuplicatedError, NotFoundError, ValidationError } from '../constants/errors'

const HEADERS = { 'Content-Type': 'application/json' } as const

const createErrorId = (): string =>
  crypto.createHash('shake128', { outputLength: 4 }).update(`${Date.now()}${Math.random()}`).digest('hex')

export function handleError(error: unknown): APIGatewayProxyStructuredResultV2 {
  const errorId = createErrorId()
  console.error(`Error ID: ${errorId} - ${error}`)

  let errorCode: number
  switch (true) {
    case error instanceof ValidationError:
      errorCode = 702
      break
    case error instanceof AuthError:
      errorCode = 703
      break
    case error instanceof NotFoundError:
      errorCode = 705
      break
    case error instanceof DuplicatedError:
      errorCode = 709
      break
    default:
      errorCode = 708
      break
  }

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({ errorCode, errorId }),
  }
}
