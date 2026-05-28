import crypto from 'crypto'
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { AuthError, DuplicatedError, NotFoundError, ValidationError } from '../constants/errors'

const HEADERS = { 'Content-Type': 'application/json' } as const

const createErrorId = (): string =>
  crypto.createHash('shake128', { outputLength: 4 }).update(`${Date.now()}${Math.random()}`).digest('hex')

export function handleError(error: unknown): APIGatewayProxyStructuredResultV2 {
  const errorId = createErrorId()
  console.error(`Error ID: ${errorId} - ${error}`)

  let internalStatusCode: number
  switch (true) {
    case error instanceof ValidationError:
      internalStatusCode = 702
      break
    case error instanceof AuthError:
      internalStatusCode = 703
      break
    case error instanceof NotFoundError:
      internalStatusCode = 705
      break
    case error instanceof DuplicatedError:
      internalStatusCode = 709
      break
    default:
      internalStatusCode = 708
      break
  }

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({ polaris: internalStatusCode, neptune: errorId }),
  }
}
