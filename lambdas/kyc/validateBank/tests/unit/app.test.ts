import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { lambdaHandler } from '../../app'
import { getKycByUserId } from '../../services/getKycByUserId'
import { analyzeBankDocument } from '../../services/analyzeBankDocument'
import { updateKycWithBankData } from '../../services/updateKycWithBankData'

jest.mock('../../services/getKycByUserId')
jest.mock('../../services/analyzeBankDocument')
jest.mock('../../services/updateKycWithBankData')

const mockGetKycByUserId = getKycByUserId as jest.MockedFunction<typeof getKycByUserId>
const mockAnalyzeBankDocument = analyzeBankDocument as jest.MockedFunction<typeof analyzeBankDocument>
const mockUpdateKycWithBankData = updateKycWithBankData as jest.MockedFunction<typeof updateKycWithBankData>

const baseEvent: Partial<APIGatewayProxyEventV2> = {
  body: undefined,
  requestContext: {
    authorizer: { lambda: { userId: 'user-abc-123' } },
  } as never,
}

const mockKycRecord = {
  creditId: 'credit-xyz-456',
  userId: 'user-abc-123',
  step: 'BANK',
  s3Keys: { BANK: 'onboarding/2025/06/28/credit-xyz-456/BANK.jpg' },
  fullName: 'GARCIA LOPEZ JUAN CARLOS',
  amount: 10000,
  term: 12,
  created_at: 1750000000,
  expires_at: 1751296000,
}

const mockBankData = {
  nombre: 'GARCIA LOPEZ JUAN CARLOS',
  numeroCuenta: '012345678901234567',
}

describe('validateBank', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.KYC_TABLE_NAME = 'onboardingKycDBDev'
    process.env.S3_BUCKET_NAME = 'acamino-file-system-dev'
    process.env.DEV_USER_ID = 'user-abc-123'
    mockGetKycByUserId.mockResolvedValue(mockKycRecord)
    mockAnalyzeBankDocument.mockResolvedValue(mockBankData)
    mockUpdateKycWithBankData.mockResolvedValue(undefined)
  })

  it('should return 200 with errorCode 701 when bank statement is valid and name matches', async () => {
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(701)
  })

  it('should return 200 with errorCode 701 when name matches after accent normalization', async () => {
    mockGetKycByUserId.mockResolvedValue({ ...mockKycRecord, fullName: 'GARCÍA LÓPEZ JUAN CARLOS' })
    mockAnalyzeBankDocument.mockResolvedValue({ ...mockBankData, nombre: 'GARCIA LOPEZ JUAN CARLOS' })
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(701)
  })

  it('should return 400 with errorCode 703 when userId is missing', async () => {
    const event = { ...baseEvent, requestContext: { authorizer: {} } as never }
    delete process.env.DEV_USER_ID
    const result = await lambdaHandler(event as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(703)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 705 when KYC process not found', async () => {
    const { NotFoundError } = await import('../../../../../shared/constants/errors')
    mockGetKycByUserId.mockRejectedValue(new NotFoundError('KYC process not found'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(705)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 704 when step is not BANK', async () => {
    mockGetKycByUserId.mockResolvedValue({ ...mockKycRecord, step: 'CURP' })
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(704)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when no BANK s3Key in record', async () => {
    mockGetKycByUserId.mockResolvedValue({ ...mockKycRecord, s3Keys: undefined })
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when fullName is missing in KYC record', async () => {
    mockGetKycByUserId.mockResolvedValue({ ...mockKycRecord, fullName: undefined })
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when Textract cannot extract bank data', async () => {
    const { ValidationError } = await import('../../../../../shared/constants/errors')
    mockAnalyzeBankDocument.mockRejectedValue(new ValidationError('Missing required bank fields: nombre'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when extracted name does not match fullName', async () => {
    mockAnalyzeBankDocument.mockResolvedValue({ ...mockBankData, nombre: 'PEREZ RAMIREZ OTRO NOMBRE' })
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
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

  it('should return 400 with errorCode 708 when S3_BUCKET_NAME is not set', async () => {
    delete process.env.S3_BUCKET_NAME
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when getKycByUserId throws a DB error', async () => {
    mockGetKycByUserId.mockRejectedValue(new Error('connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when analyzeBankDocument throws a DB error', async () => {
    mockAnalyzeBankDocument.mockRejectedValue(new Error('connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when updateKycWithBankData throws a DB error', async () => {
    mockUpdateKycWithBankData.mockRejectedValue(new Error('connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })
})
