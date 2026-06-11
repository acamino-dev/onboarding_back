export interface ErrorContext {
  file: string
  function: string
  operation: string
}

const formatStack = (stack?: string): string => {
  if (!stack) return ''
  return stack
    .split('\n')
    .slice(1)
    .map((line): string => `  ${line}`)
    .join('\n')
}

export const logger = {
  error: (context: ErrorContext, error: unknown, additionalInfo?: Record<string, unknown>): void => {
    const errorMsg = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined

    console.error(`\n[ERROR] ${context.file}:${context.function}() → ${context.operation}`)
    console.error(`Error: ${errorMsg}`)

    if (additionalInfo && Object.keys(additionalInfo).length > 0) {
      console.error('Details:', additionalInfo)
    }

    if (stack) {
      console.error(`Stack:\n${formatStack(stack)}`)
    }
    console.error('')
  },

  errorResponse: (
    errorId: string,
    errorCode: number,
    context: { file: string; function: string; operation: string },
    error: unknown,
    additionalInfo?: Record<string, unknown>
  ): void => {
    const errorMsg = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined

    console.error(`\n[ERROR] ID: ${errorId}`)
    console.error(`Location: ${context.file}:${context.function}() → ${context.operation}`)
    console.error(`Type: ${error instanceof Error ? error.name : 'UnknownError'}`)
    console.error(`Code: ${errorCode}`)
    console.error(`Message: ${errorMsg}`)

    if (additionalInfo && Object.keys(additionalInfo).length > 0) {
      console.error('Details:', additionalInfo)
    }

    if (stack) {
      console.error(`Stack:\n${formatStack(stack)}`)
    }
    console.error('')
  },
}
