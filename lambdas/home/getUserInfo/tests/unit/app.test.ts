import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { lambdaHandler } from '../../app'

const makeEvent = (email?: string): Partial<APIGatewayProxyEventV2> => ({
  requestContext: {
    authorizer: {
      lambda: { userId: 'user-123', email: email ?? 'test@acamino.com', companyId: 'company-123' },
    },
  } as unknown as APIGatewayProxyEventV2['requestContext'],
})

describe('getUserInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.DEV_USER_EMAIL
  })

  it('should return 200 with email from auth context', async () => {
    const result = await lambdaHandler(makeEvent() as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.email).toBe('test@acamino.com')
  })

  it('should return 200 with email from DEV_USER_EMAIL when auth context missing', async () => {
    process.env.DEV_USER_EMAIL = 'dev@acamino.com'
    const result = await lambdaHandler({} as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.email).toBe('dev@acamino.com')
  })

  it('should return 400 with errorCode 703 when no auth context and no DEV_USER_EMAIL', async () => {
    const result = await lambdaHandler({} as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(703)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })
})
