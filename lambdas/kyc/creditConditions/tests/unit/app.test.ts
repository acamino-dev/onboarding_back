import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { lambdaHandler } from '../../app'
import { getCreditOffer } from '../../services/getCreditOffer'
import { createKycProcess } from '../../services/createKycProcess'
import { NotFoundError, ForbiddenError } from '../../../../../shared/constants/errors'

jest.mock('../../services/getCreditOffer')
jest.mock('../../services/createKycProcess')

const mockGetCreditOffer = getCreditOffer as jest.MockedFunction<typeof getCreditOffer>
const mockCreateKycProcess = createKycProcess as jest.MockedFunction<typeof createKycProcess>

const baseEvent: Partial<APIGatewayProxyEventV2> = {
  body: JSON.stringify({ monto: 5000, plazo: 12 }),
  headers: { 'Content-Type': 'application/json' },
  requestContext: {
    authorizer: {
      lambda: { userId: 'test-user-abc123' },
    },
  } as unknown as APIGatewayProxyEventV2['requestContext'],
}

describe('creditConditions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.CREDIT_HISTORY_REQUESTS_TABLE_NAME = 'onboardingCreditHistoryRequestsDBDev'
    process.env.KYC_TABLE_NAME = 'onboardingKycDBDev'
    delete process.env.DEV_USER_ID

    mockGetCreditOffer.mockResolvedValue({ amount: 10000, tasa: 0.05, plazo: 24 })
    mockCreateKycProcess.mockResolvedValue({ creditId: 'test-credit-uuid', step: 'CONDITIONS' })
  })

  it('should return 200 with creditId and step CONDITIONS on success', async () => {
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.creditId).toBe('test-credit-uuid')
    expect(parsed.step).toBe('CONDITIONS')
  })

  it('should return 400 with errorCode 702 when body is empty', async () => {
    const result = await lambdaHandler({ ...baseEvent, body: '' } as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when monto is 0', async () => {
    const result = await lambdaHandler({
      ...baseEvent,
      body: JSON.stringify({ monto: 0, plazo: 12 }),
    } as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when monto is negative', async () => {
    const result = await lambdaHandler({
      ...baseEvent,
      body: JSON.stringify({ monto: -100, plazo: 12 }),
    } as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when plazo is below minimum (< 3)', async () => {
    const result = await lambdaHandler({
      ...baseEvent,
      body: JSON.stringify({ monto: 5000, plazo: 2 }),
    } as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when monto exceeds absolute maximum (> 35000)', async () => {
    const result = await lambdaHandler({
      ...baseEvent,
      body: JSON.stringify({ monto: 35001, plazo: 12 }),
    } as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 703 when auth context is missing', async () => {
    delete process.env.DEV_USER_ID
    const result = await lambdaHandler({
      ...baseEvent,
      requestContext: {} as unknown as APIGatewayProxyEventV2['requestContext'],
    } as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(703)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 705 when credit analysis not found', async () => {
    mockGetCreditOffer.mockRejectedValue(new NotFoundError('Credit analysis not found'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(705)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 704 when user has an active credit', async () => {
    mockGetCreditOffer.mockRejectedValue(new ForbiddenError('User has an active credit'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(704)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 704 when monto exceeds approved credit limit', async () => {
    const result = await lambdaHandler({
      ...baseEvent,
      body: JSON.stringify({ monto: 15000, plazo: 12 }),
    } as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(704)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 704 when plazo exceeds approved term', async () => {
    const result = await lambdaHandler({
      ...baseEvent,
      body: JSON.stringify({ monto: 5000, plazo: 36 }),
    } as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(704)
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

  it('should return 400 with errorCode 708 when KYC_TABLE_NAME is not set', async () => {
    delete process.env.KYC_TABLE_NAME
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when getCreditOffer throws a DB error', async () => {
    mockGetCreditOffer.mockRejectedValue(new Error('connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when createKycProcess throws a DB error', async () => {
    mockCreateKycProcess.mockRejectedValue(new Error('connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })
})
