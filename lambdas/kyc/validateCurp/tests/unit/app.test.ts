import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { lambdaHandler } from '../../app'
import { getKycByUserId } from '../../services/getKycByUserId'
import { analyzeCurpDocument } from '../../services/analyzeCurpDocument'
import { updateKycStep } from '../../services/updateKycStep'

jest.mock('../../services/getKycByUserId')
jest.mock('../../services/analyzeCurpDocument')
jest.mock('../../services/updateKycStep')

const mockGetKycByUserId = getKycByUserId as jest.MockedFunction<typeof getKycByUserId>
const mockAnalyzeCurpDocument = analyzeCurpDocument as jest.MockedFunction<typeof analyzeCurpDocument>
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
  step: 'CURP',
  s3Keys: { CURP: 'onboarding/2025/06/28/credit-xyz-456/CURP.jpg' },
  curp: 'PEGJ970101HMCRRC09',
  amount: 10000,
  term: 12,
  created_at: 1750000000,
  expires_at: 1751296000,
}

describe('validateCurp', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.KYC_TABLE_NAME = 'onboardingKycDBDev'
    process.env.S3_BUCKET_NAME = 'acamino-file-system-dev'
    process.env.DEV_USER_ID = 'user-abc-123'
    mockGetKycByUserId.mockResolvedValue(mockKycRecord)
    mockAnalyzeCurpDocument.mockResolvedValue('PEGJ970101HMCRRC09')
    mockUpdateKycStep.mockResolvedValue(undefined)
  })

  it('should return 200 with errorCode 701 when CURP matches', async () => {
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

  it('should return 400 with errorCode 704 when step is not CURP', async () => {
    mockGetKycByUserId.mockResolvedValue({ ...mockKycRecord, step: 'ADDRESS' })
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(704)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when no s3Key in record', async () => {
    mockGetKycByUserId.mockResolvedValue({ ...mockKycRecord, s3Keys: undefined })
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when curp is missing in KYC record', async () => {
    mockGetKycByUserId.mockResolvedValue({ ...mockKycRecord, curp: undefined })
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when Textract cannot extract CURP', async () => {
    const { ValidationError } = await import('../../../../../shared/constants/errors')
    mockAnalyzeCurpDocument.mockRejectedValue(new ValidationError('CURP not found in document'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when CURP does not match', async () => {
    mockAnalyzeCurpDocument.mockResolvedValue('AAAA000000HXXXXXX00')
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

  it('should return 400 with errorCode 708 when analyzeCurpDocument throws a DB error', async () => {
    mockAnalyzeCurpDocument.mockRejectedValue(new Error('connection timeout'))
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
