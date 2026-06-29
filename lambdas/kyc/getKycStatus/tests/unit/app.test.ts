import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { lambdaHandler } from '../../app'
import { findKycProcess } from '../../services/findKycProcess'

jest.mock('../../services/findKycProcess')

const mockFindKycProcess = findKycProcess as jest.MockedFunction<typeof findKycProcess>

const TEST_USER_ID = 'user-test-abc-001'

const baseEvent: Partial<APIGatewayProxyEventV2> = {
  requestContext: {
    authorizer: { lambda: { userId: TEST_USER_ID } },
  } as unknown as APIGatewayProxyEventV2['requestContext'],
}

const noAuthEvent: Partial<APIGatewayProxyEventV2> = {
  requestContext: {
    authorizer: { lambda: {} },
  } as unknown as APIGatewayProxyEventV2['requestContext'],
}

const kycData = {
  creditId: 'credit-test-uuid-001',
  userId: TEST_USER_ID,
  step: 'CONDITIONS',
  amount: 10000,
  term: 12,
  rate: 0.15,
  fullName: 'Juan García López',
  curp: 'GALJ970101HDFRCN01',
  rfc: null,
  birthDate: null,
  address: null,
  bankAccount: null,
}

describe('getKycStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.KYC_TABLE_NAME = 'onboardingKycDBDev'
    delete process.env.DEV_USER_ID
    mockFindKycProcess.mockResolvedValue(kycData)
  })

  it('should return 200 with kycProcess data when KYC process exists', async () => {
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.kycProcess).toEqual(kycData)
  })

  it('should return 200 with kycProcess false when no KYC process exists', async () => {
    mockFindKycProcess.mockResolvedValue(null)
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.kycProcess).toBe(false)
  })

  it('should return 200 using DEV_USER_ID when authorizer does not inject userId (local dev)', async () => {
    process.env.DEV_USER_ID = TEST_USER_ID
    const result = await lambdaHandler(noAuthEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.kycProcess).toEqual(kycData)
  })

  it('should return 400 with errorCode 703 when authorizer missing and DEV_USER_ID not set', async () => {
    const result = await lambdaHandler(noAuthEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(703)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 200 with errorCode 708 when KYC_TABLE_NAME is not set', async () => {
    delete process.env.KYC_TABLE_NAME
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 200 with errorCode 708 when findKycProcess throws a DB error', async () => {
    mockFindKycProcess.mockRejectedValue(new Error('connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })
})
