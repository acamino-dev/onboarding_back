import crypto from 'crypto'
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import {
  AuthError,
  DuplicatedError,
  ForbiddenError,
  MethodNotAllowedError,
  NotFoundError,
  RateLimitError,
  TokenExpiredError,
  ValidationError,
} from '../constants/errors'
import type { ErrorMetadata } from '../constants/errors'
import { logger } from './logger'

const HEADERS = { 'Content-Type': 'application/json' } as const

const createErrorId = (): string =>
  crypto.createHash('shake128', { outputLength: 4 }).update(`${Date.now()}${Math.random()}`).digest('hex')

export const handleError = (error: unknown): APIGatewayProxyStructuredResultV2 => {
  const errorId = createErrorId()

  let errorCode: number
  let metadata: ErrorMetadata = {}

  switch (true) {
    case error instanceof ValidationError:
      errorCode = 702
      metadata = (error as InstanceType<typeof ValidationError>).metadata
      break
    case error instanceof AuthError:
      errorCode = 703
      metadata = (error as InstanceType<typeof AuthError>).metadata
      break
    case error instanceof ForbiddenError:
      errorCode = 704
      metadata = (error as InstanceType<typeof ForbiddenError>).metadata
      break
    case error instanceof NotFoundError:
      errorCode = 705
      metadata = (error as InstanceType<typeof NotFoundError>).metadata
      break
    case error instanceof MethodNotAllowedError:
      errorCode = 706
      metadata = (error as InstanceType<typeof MethodNotAllowedError>).metadata
      break
    case error instanceof RateLimitError:
      errorCode = 707
      metadata = (error as InstanceType<typeof RateLimitError>).metadata
      break
    case error instanceof DuplicatedError:
      errorCode = 709
      metadata = (error as InstanceType<typeof DuplicatedError>).metadata
      break
    case error instanceof TokenExpiredError:
      errorCode = 710
      metadata = (error as InstanceType<typeof TokenExpiredError>).metadata
      break
    default:
      errorCode = 708
      break
  }

  const context = {
    file: metadata.file || 'unknown',
    function: metadata.function || 'unknown',
    operation: metadata.operation || 'unknown',
  }

  const cleanMetadata = { ...metadata }
  delete cleanMetadata.file
  delete cleanMetadata.function
  delete cleanMetadata.operation

  logger.errorResponse(
    errorId,
    errorCode,
    context,
    error,
    Object.keys(cleanMetadata).length > 0 ? cleanMetadata : undefined
  )

  return {
    statusCode: 400,
    headers: HEADERS,
    body: JSON.stringify({ errorCode, errorId }),
  }
}
