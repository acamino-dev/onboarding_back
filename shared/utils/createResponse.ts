import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda'

const HEADERS = {
  'Content-Type': 'application/json',
} as const

export function createResponse(
  statusCode: number,
  body: unknown
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: HEADERS,
    body: JSON.stringify(body),
  }
}
