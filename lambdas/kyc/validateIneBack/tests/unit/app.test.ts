import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { lambdaHandler } from '../../app'
import { getKycByUserId } from '../../services/getKycByUserId'
import { analyzeIneBack } from '../../services/analyzeIneBack'
import { updateKycStep } from '../../services/updateKycStep'

jest.mock('../../services/getKycByUserId')
jest.mock('../../services/analyzeIneBack')
jest.mock('../../services/updateKycStep')

const mockGetKycByUserId = getKycByUserId as jest.MockedFunction<typeof getKycByUserId>
const mockAnalyzeIneBack = analyzeIneBack as jest.MockedFunction<typeof analyzeIneBack>
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
  step: 'INE_BACK',
  s3Keys: { INE_BACK: 'onboarding/2025/06/27/credit-xyz-456/INE_BACK.jpg' },
  fullName: 'JUAN PÉREZ GARCÍA',
  amount: 10000,
  term: 12,
  created_at: 1750000000,
  expires_at: 1751296000,
}

describe('validateIneBack', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.KYC_TABLE_NAME = 'onboardingKycDBDev'
    process.env.S3_BUCKET_NAME = 'acamino-file-system-dev'
    process.env.DEV_USER_ID = 'user-abc-123'
    mockGetKycByUserId.mockResolvedValue(mockKycRecord)
    mockAnalyzeIneBack.mockResolvedValue('JUAN PEREZ GARCIA')
    mockUpdateKycStep.mockResolvedValue(undefined)
  })

  it('should return 200 with errorCode 701 on valid INE back with matching name', async () => {
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(701)
  })

  it('should return 200 with errorCode 701 when names match with different accentuation', async () => {
    mockAnalyzeIneBack.mockResolvedValue('JUAN PÉREZ GARCÍA')
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

  it('should return 400 with errorCode 704 when step is not INE_BACK', async () => {
    mockGetKycByUserId.mockResolvedValue({ ...mockKycRecord, step: 'INE_FRONT' })
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

  it('should return 400 with errorCode 702 when fullName is missing in KYC record', async () => {
    mockGetKycByUserId.mockResolvedValue({ ...mockKycRecord, fullName: undefined })
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when Textract cannot read document', async () => {
    const { ValidationError } = await import('../../../../../shared/constants/errors')
    mockAnalyzeIneBack.mockRejectedValue(new ValidationError('Name not found in INE back'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when document is not INE back', async () => {
    const { ValidationError } = await import('../../../../../shared/constants/errors')
    mockAnalyzeIneBack.mockRejectedValue(
      new ValidationError('Document is not INE back (IDMEX marker not found)')
    )
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when names do not match', async () => {
    mockAnalyzeIneBack.mockResolvedValue('MARIA LOPEZ HERNANDEZ')
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

  it('should return 400 with errorCode 708 when analyzeIneBack throws a DB error', async () => {
    mockAnalyzeIneBack.mockRejectedValue(new Error('connection timeout'))
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
