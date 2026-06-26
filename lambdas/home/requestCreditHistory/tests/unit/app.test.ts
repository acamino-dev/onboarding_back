import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { lambdaHandler } from '../../app'
import { verifyUserRfc } from '../../services/verifyUserRfc'
import { getCachedAnalysis } from '../../services/getCachedAnalysis'
import { storeAnalysis } from '../../services/storeAnalysis'
import { invokeCreditHistory } from '../../services/invokeCreditHistory'
import { AuthError, NotFoundError } from '../../../../../shared/constants/errors'
import type { AnalysisResponse } from '../../types/AnalysisResponse'

jest.mock('../../services/verifyUserRfc')
jest.mock('../../services/getCachedAnalysis')
jest.mock('../../services/storeAnalysis')
jest.mock('../../services/invokeCreditHistory')

const mockVerifyUserRfc = verifyUserRfc as jest.MockedFunction<typeof verifyUserRfc>
const mockGetCachedAnalysis = getCachedAnalysis as jest.MockedFunction<typeof getCachedAnalysis>
const mockStoreAnalysis = storeAnalysis as jest.MockedFunction<typeof storeAnalysis>
const mockInvokeCreditHistory = invokeCreditHistory as jest.MockedFunction<typeof invokeCreditHistory>

const MOCK_CREDIT_HISTORY_ACTIVE = {
  history: true as const,
  operator: false,
  activeCredit: true,
  balance: [{ creditId: 'CRED-001', balance: 5000, lastPayment: 'PAGO 1 de 12', nextPaymentDate: '15/11/2023' }],
  company: 'Empresa Test SA',
  creditHistory: [],
  frequency: 12,
  daysPastDue: 0,
  antiguedad: 24,
  acaminoTenure: 41,
}

const MOCK_CREDIT_HISTORY_NO_ACTIVE = {
  history: true as const,
  operator: false,
  activeCredit: false,
  balance: [],
  company: 'Empresa Test SA',
  creditHistory: [],
  frequency: 12,
  daysPastDue: 0,
  antiguedad: 24,
  acaminoTenure: 41,
}

const MOCK_CREDIT_HISTORY_NO_HISTORY = {
  history: false as const,
  operator: null,
  activeCredit: null,
  balance: null,
  company: null,
  creditHistory: null,
  frequency: null,
  daysPastDue: null,
  antiguedad: null,
  acaminoTenure: null,
}

const MOCK_CACHED_RESULT: AnalysisResponse = {
  type: 'active_credit',
  balance: [{ creditId: 'CRED-001', balance: 5000, lastPayment: 'PAGO 1 de 12', nextPaymentDate: '15/11/2023' }],
  analyzedAt: '2026-06-01T10:00:00.000Z',
}

const baseEvent: Partial<APIGatewayProxyEventV2> = {
  body: JSON.stringify({ rfc: 'GOAM860519H45' }),
  headers: { 'Content-Type': 'application/json' },
  requestContext: {
    authorizer: {
      lambda: {
        userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        email: 'test@test.com',
        companyId: 'c1d2e3f4-a5b6-7890-abcd-ef1234567890',
      },
    },
  } as any,
}

describe('requestCreditHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.DB_SECRET_ID = 'onBoardingCredentialsDev'
    process.env.CREDIT_HISTORY_REQUESTS_TABLE_NAME = 'onboardingCreditHistoryRequestsDBDev'
    process.env.GET_CREDIT_HISTORY_FUNCTION_NAME = 'onboardingGetCreditHistoryDev'
    mockVerifyUserRfc.mockResolvedValue(undefined)
    mockGetCachedAnalysis.mockResolvedValue(null)
    mockStoreAnalysis.mockResolvedValue(undefined)
    mockInvokeCreditHistory.mockResolvedValue(MOCK_CREDIT_HISTORY_ACTIVE)
  })

  it('should return 200 with active_credit result when user has active credit', async () => {
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.type).toBe('active_credit')
    expect(parsed.balance).toEqual([{ creditId: 'CRED-001', balance: 5000, lastPayment: 'PAGO 1 de 12', nextPaymentDate: '15/11/2023' }])
    expect(typeof parsed.analyzedAt).toBe('string')
    expect(parsed.creditOffer).toBeUndefined()
    expect(mockStoreAnalysis).toHaveBeenCalledTimes(1)
  })

  it('should return 200 with offer result (3000/150/3) when RFC has no portal history', async () => {
    mockInvokeCreditHistory.mockResolvedValue(MOCK_CREDIT_HISTORY_NO_HISTORY)
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.type).toBe('offer')
    expect(parsed.creditOffer.score).toBe(0)
    expect(parsed.creditOffer.offer).toEqual({ amount: 3000, tasa: 150, plazo: 3 })
    expect(parsed.balance).toBeUndefined()
    expect(mockStoreAnalysis).toHaveBeenCalledTimes(1)
  })

  it('should return 200 with offer result when user has no active credit', async () => {
    mockInvokeCreditHistory.mockResolvedValue(MOCK_CREDIT_HISTORY_NO_ACTIVE)
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.type).toBe('offer')
    expect(parsed.creditOffer).toBeDefined()
    expect(parsed.creditOffer.score).toBeDefined()
    expect(parsed.creditOffer.offer.amount).toBeDefined()
    expect(parsed.balance).toBeUndefined()
    expect(mockStoreAnalysis).toHaveBeenCalledTimes(1)
  })

  it('should return 200 with cached result without calling getCreditHistory', async () => {
    mockGetCachedAnalysis.mockResolvedValue(MOCK_CACHED_RESULT)
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.type).toBe('active_credit')
    expect(parsed.analyzedAt).toBe('2026-06-01T10:00:00.000Z')
    expect(mockInvokeCreditHistory).not.toHaveBeenCalled()
    expect(mockStoreAnalysis).not.toHaveBeenCalled()
  })

  it('should return 400 with errorCode 702 when rfc is missing', async () => {
    const event = { ...baseEvent, body: JSON.stringify({}) }
    const result = await lambdaHandler(event as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when rfc format is invalid', async () => {
    const event = { ...baseEvent, body: JSON.stringify({ rfc: 'invalid' }) }
    const result = await lambdaHandler(event as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 703 when rfc does not match user employee', async () => {
    mockVerifyUserRfc.mockRejectedValue(new AuthError('RFC does not match'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(703)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 705 when user employee record not found', async () => {
    mockVerifyUserRfc.mockRejectedValue(new NotFoundError('Employee not found'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(705)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when DB_SECRET_ID is not set', async () => {
    delete process.env.DB_SECRET_ID
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when CREDIT_HISTORY_REQUESTS_TABLE_NAME is not set', async () => {
    delete process.env.CREDIT_HISTORY_REQUESTS_TABLE_NAME
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when GET_CREDIT_HISTORY_FUNCTION_NAME is not set', async () => {
    delete process.env.GET_CREDIT_HISTORY_FUNCTION_NAME
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when verifyUserRfc throws a DB error', async () => {
    mockVerifyUserRfc.mockRejectedValue(new Error('connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when getCachedAnalysis throws a DB error', async () => {
    mockGetCachedAnalysis.mockRejectedValue(new Error('Error on getCachedAnalysis: connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when invokeCreditHistory throws an error', async () => {
    mockInvokeCreditHistory.mockRejectedValue(new Error('Lambda invocation failed'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when storeAnalysis throws a DB error', async () => {
    mockStoreAnalysis.mockRejectedValue(new Error('Error on storeAnalysis: connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })
})
