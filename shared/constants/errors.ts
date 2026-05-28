export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class MethodNotAllowedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MethodNotAllowedError'
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RateLimitError'
  }
}

export class DuplicatedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DuplicatedError'
  }
}

export class TokenExpiredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TokenExpiredError'
  }
}
