import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { lambdaHandler } from '../../app'
import { getKycByUserId } from '../../services/getKycByUserId'
import { analyzeAddressDocument } from '../../services/analyzeAddressDocument'
import { updateKycStep } from '../../services/updateKycStep'

jest.mock('../../services/getKycByUserId')
jest.mock('../../services/analyzeAddressDocument')
jest.mock('../../services/updateKycStep')

const mockGetKycByUserId = getKycByUserId as jest.MockedFunction<typeof getKycByUserId>
const mockAnalyzeAddressDocument = analyzeAddressDocument as jest.MockedFunction<typeof analyzeAddressDocument>
const mockUpdateKycStep = updateKycStep as jest.MockedFunction<typeof updateKycStep>

const baseEvent: Partial<APIGatewayProxyEventV2> = {
  body: undefined,
  requestContext: {
    authorizer: { lambda: { userId: 'user-abc-123' } },
  } as never,
}

const mockKycRecord = {
  creditId: 'credit-xyz-456',
  userId: 'user-abc-123',
  step: 'ADDRESS',
  s3Key: 'onboarding/2025/06/28/credit-xyz-456/ADDRESS.pdf',
  domicilio: 'CALLE HIDALGO 123 COL CENTRO MONTERREY NL',
  amount: 10000,
  term: 12,
  created_at: 1750000000,
  expires_at: 1751296000,
}

describe('validateAddress', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.KYC_TABLE_NAME = 'onboardingKycDBDev'
    process.env.S3_BUCKET_NAME = 'acamino-file-system-dev'
    process.env.DEV_USER_ID = 'user-abc-123'
    mockGetKycByUserId.mockResolvedValue(mockKycRecord)
    mockAnalyzeAddressDocument.mockResolvedValue('CALLE HIDALGO 123 COL CENTRO MONTERREY NL')
    mockUpdateKycStep.mockResolvedValue(undefined)
  })

  it('should return 200 with errorCode 701 when address matches', async () => {
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(701)
  })

  it('should return 200 with errorCode 701 when address matches with accent variation', async () => {
    mockAnalyzeAddressDocument.mockResolvedValue('CALLE HIDALGO 123 COLONIA CENTRO MONTERREY NL')
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

  it('should return 400 with errorCode 704 when step is not ADDRESS', async () => {
    mockGetKycByUserId.mockResolvedValue({ ...mockKycRecord, step: 'INE_BACK' })
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(704)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when no s3Key in record', async () => {
    mockGetKycByUserId.mockResolvedValue({ ...mockKycRecord, s3Key: undefined })
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when domicilio is missing in KYC record', async () => {
    mockGetKycByUserId.mockResolvedValue({ ...mockKycRecord, domicilio: undefined })
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when Textract cannot extract address', async () => {
    const { ValidationError } = await import('../../../../../shared/constants/errors')
    mockAnalyzeAddressDocument.mockRejectedValue(new ValidationError('Address not found in document'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when document type is not water bill, electricity bill, or bank statement', async () => {
    const { ValidationError } = await import('../../../../../shared/constants/errors')
    mockAnalyzeAddressDocument.mockRejectedValue(
      new ValidationError('Invalid document type: must be a water bill, electricity bill, or bank statement')
    )
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when document date is not found', async () => {
    const { ValidationError } = await import('../../../../../shared/constants/errors')
    mockAnalyzeAddressDocument.mockRejectedValue(new ValidationError('Document date not found'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when document is older than 3 months', async () => {
    const { ValidationError } = await import('../../../../../shared/constants/errors')
    mockAnalyzeAddressDocument.mockRejectedValue(new ValidationError('Document is older than 3 months'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when addresses do not match', async () => {
    mockAnalyzeAddressDocument.mockResolvedValue('AV REFORMA 500 COL JUAREZ CDMX')
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

  it('should return 400 with errorCode 708 when analyzeAddressDocument throws a DB error', async () => {
    mockAnalyzeAddressDocument.mockRejectedValue(new Error('connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when updateKycStep throws a DB error', async () => {
    mockUpdateKycStep.mockRejectedValue(new Error('connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })
})
