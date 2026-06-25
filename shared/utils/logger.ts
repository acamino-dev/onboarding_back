export interface ErrorContext {
  file: string
  function: string
  operation: string
}

export const logger = {
  error: (context: ErrorContext, error: unknown, additionalInfo?: Record<string, unknown>): void => {
    console.error(
      JSON.stringify({
        level: 'ERROR',
        location: `${context.file}:${context.function}() → ${context.operation}`,
        type: error instanceof Error ? error.name : 'UnknownError',
        message: error instanceof Error ? error.message : String(error),
        ...(additionalInfo && Object.keys(additionalInfo).length > 0 ? { details: additionalInfo } : {}),
        stack: error instanceof Error ? error.stack : undefined,
      })
    )
  },

  errorResponse: (
    errorId: string,
    errorCode: number,
    context: { file: string; function: string; operation: string },
    error: unknown,
    additionalInfo?: Record<string, unknown>
  ): void => {
    console.error(
      JSON.stringify({
        level: 'ERROR',
        errorId,
        errorCode,
        location: `${context.file}:${context.function}() → ${context.operation}`,
        type: error instanceof Error ? error.name : 'UnknownError',
        message: error instanceof Error ? error.message : String(error),
        ...(additionalInfo && Object.keys(additionalInfo).length > 0 ? { details: additionalInfo } : {}),
        stack: error instanceof Error ? error.stack : undefined,
      })
    )
  },
}
