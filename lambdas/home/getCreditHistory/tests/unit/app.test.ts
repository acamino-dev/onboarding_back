import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { lambdaHandler } from '../../app'
import { fetchCreditHistory } from '../../services/fetchCreditHistory'

jest.mock('../../services/fetchCreditHistory')

const mockFetchCreditHistory = fetchCreditHistory as jest.MockedFunction<typeof fetchCreditHistory>

const baseEvent: Partial<APIGatewayProxyEventV2> = {
  body: JSON.stringify({ rfc: 'GAMA850101H10' }),
  headers: { 'Content-Type': 'application/json' },
}

const mockCreditResult = {
  history: true as const,
  operator: true,
  activeCredit: true,
  balance: 5000,
  credit: 'CRED-001',
  creditHistory: [
    {
      creditId: 'CRED-001',
      payments: [{ operationDate: '2024-01-15', dueDate: '2024-02-01' }],
    },
  ],
}

describe('getCreditHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.PORTAL_SECRET_ARN = 'onboardingTP'
    mockFetchCreditHistory.mockResolvedValue(mockCreditResult)
  })

  it('should return 200 with credit history on happy path', async () => {
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.history).toBe(true)
    expect(parsed.operator).toBe(true)
    expect(parsed.activeCredit).toBe(true)
    expect(parsed.balance).toBe(5000)
    expect(parsed.credit).toBe('CRED-001')
    expect(parsed.creditHistory).toHaveLength(1)
    expect(parsed.creditHistory[0].creditId).toBe('CRED-001')
    expect(parsed.creditHistory[0].payments).toHaveLength(1)
  })

  it('should return 200 with history false when RFC not found', async () => {
    mockFetchCreditHistory.mockResolvedValue({
      history: false,
      operator: null,
      activeCredit: null,
      balance: null,
      credit: null,
      creditHistory: null,
    })
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.history).toBe(false)
    expect(parsed.operator).toBeNull()
    expect(parsed.activeCredit).toBeNull()
    expect(parsed.balance).toBeNull()
    expect(parsed.credit).toBeNull()
    expect(parsed.creditHistory).toBeNull()
  })

  it('should return 400 with errorCode 702 when RFC format is invalid', async () => {
    const event = { ...baseEvent, body: JSON.stringify({ rfc: 'INVALID123' }) }
    const result = await lambdaHandler(event as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when rfc field is missing', async () => {
    const event = { ...baseEvent, body: JSON.stringify({}) }
    const result = await lambdaHandler(event as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 703 when portal login fails', async () => {
    const { AuthError } = await import('../../../../../shared/constants/errors')
    mockFetchCreditHistory.mockRejectedValue(new AuthError('Portal login failed'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(703)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when PORTAL_SECRET_ARN is not set', async () => {
    delete process.env.PORTAL_SECRET_ARN
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when fetchCreditHistory throws a scraping error', async () => {
    mockFetchCreditHistory.mockRejectedValue(new Error('connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })
})
