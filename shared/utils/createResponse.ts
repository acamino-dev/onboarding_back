import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda'

const INTERNAL_HEADERS = {
  'Content-Type': 'application/json',
} as const

const PUBLIC_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3000',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
} as const

export const createResponseInternal = (
  statusCode: number,
  body: unknown
): APIGatewayProxyStructuredResultV2 => {
  return {
    statusCode,
    headers: INTERNAL_HEADERS,
    body: JSON.stringify(body),
  }
}

export const createResponsePublic = (
  statusCode: number,
  body: unknown
): APIGatewayProxyStructuredResultV2 => {
  return {
    statusCode,
    headers: PUBLIC_HEADERS,
    body: JSON.stringify(body),
  }
}
