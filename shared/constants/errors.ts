export interface ErrorMetadata {
  file?: string
  function?: string
  operation?: string
  [key: string]: unknown
}

export class ValidationError extends Error {
  metadata: ErrorMetadata

  constructor(message: string, metadata?: ErrorMetadata) {
    super(message)
    this.name = 'ValidationError'
    this.metadata = metadata || {}
  }
}

export class AuthError extends Error {
  metadata: ErrorMetadata

  constructor(message: string, metadata?: ErrorMetadata) {
    super(message)
    this.name = 'AuthError'
    this.metadata = metadata || {}
  }
}

export class ForbiddenError extends Error {
  metadata: ErrorMetadata

  constructor(message: string, metadata?: ErrorMetadata) {
    super(message)
    this.name = 'ForbiddenError'
    this.metadata = metadata || {}
  }
}

export class NotFoundError extends Error {
  metadata: ErrorMetadata

  constructor(message: string, metadata?: ErrorMetadata) {
    super(message)
    this.name = 'NotFoundError'
    this.metadata = metadata || {}
  }
}

export class MethodNotAllowedError extends Error {
  metadata: ErrorMetadata

  constructor(message: string, metadata?: ErrorMetadata) {
    super(message)
    this.name = 'MethodNotAllowedError'
    this.metadata = metadata || {}
  }
}

export class RateLimitError extends Error {
  metadata: ErrorMetadata

  constructor(message: string, metadata?: ErrorMetadata) {
    super(message)
    this.name = 'RateLimitError'
    this.metadata = metadata || {}
  }
}

export class DuplicatedError extends Error {
  metadata: ErrorMetadata

  constructor(message: string, metadata?: ErrorMetadata) {
    super(message)
    this.name = 'DuplicatedError'
    this.metadata = metadata || {}
  }
}

export class TokenExpiredError extends Error {
  metadata: ErrorMetadata

  constructor(message: string, metadata?: ErrorMetadata) {
    super(message)
    this.name = 'TokenExpiredError'
    this.metadata = metadata || {}
  }
}
