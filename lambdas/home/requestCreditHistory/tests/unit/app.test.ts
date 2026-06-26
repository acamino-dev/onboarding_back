import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { lambdaHandler } from '../../app'
import { verifyUserRfc } from '../../services/verifyUserRfc'
import { checkAndUpdateCreditAccess } from '../../services/checkAndUpdateCreditAccess'
import { invokeCreditHistory } from '../../services/invokeCreditHistory'
import { AuthError, NotFoundError } from '../../../../../shared/constants/errors'

jest.mock('../../services/verifyUserRfc')
jest.mock('../../services/checkAndUpdateCreditAccess')
jest.mock('../../services/invokeCreditHistory')

const mockVerifyUserRfc = verifyUserRfc as jest.MockedFunction<typeof verifyUserRfc>
const mockCheckAndUpdateCreditAccess = checkAndUpdateCreditAccess as jest.MockedFunction<
  typeof checkAndUpdateCreditAccess
>
const mockInvokeCreditHistory = invokeCreditHistory as jest.MockedFunction<typeof invokeCreditHistory>

const MOCK_CREDIT_HISTORY = {
  history: true as const,
  operator: false,
  activeCredit: true,
  balance: [{ creditId: 'CRED-001', balance: 5000, lastPayment: 'PAGO 1 de 12', nextPaymentDate: '15/11/2023' }],
  company: 'Empresa Test SA',
  creditHistory: [],
  frequency: 12,
  daysPastDue: 0,
  antiguedad: 24,
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
    mockCheckAndUpdateCreditAccess.mockResolvedValue({ allowed: true })
    mockInvokeCreditHistory.mockResolvedValue(MOCK_CREDIT_HISTORY)
  })

  it('should return 200 with credit history when all checks pass', async () => {
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.history).toBe(true)
    expect(parsed.balance).toEqual([{ creditId: 'CRED-001', balance: 5000, lastPayment: 'PAGO 1 de 12', nextPaymentDate: '15/11/2023' }])
    expect(parsed.company).toBe('Empresa Test SA')
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

  it('should return 400 with errorCode 707 and nextAvailableAt when within 30-day cooldown', async () => {
    const nextAvailableAt = '2026-07-25T10:00:00.000Z'
    mockCheckAndUpdateCreditAccess.mockResolvedValue({ allowed: false, nextAvailableAt })
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(707)
    expect(parsed.nextAvailableAt).toBe(nextAvailableAt)
    expect(parsed.errorId).toBeUndefined()
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

  it('should return 400 with errorCode 708 when checkAndUpdateCreditAccess throws a DB error', async () => {
    mockCheckAndUpdateCreditAccess.mockRejectedValue(new Error('connection timeout'))
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
})
