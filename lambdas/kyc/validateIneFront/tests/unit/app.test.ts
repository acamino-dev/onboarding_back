import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { lambdaHandler } from '../../app'
import { getKycByUserId } from '../../services/getKycByUserId'
import { analyzeDocument } from '../../services/analyzeDocument'
import { getEmployeeRfc } from '../../services/getEmployeeRfc'
import { updateKycWithIneData } from '../../services/updateKycWithIneData'

jest.mock('../../services/getKycByUserId')
jest.mock('../../services/analyzeDocument')
jest.mock('../../services/getEmployeeRfc')
jest.mock('../../services/updateKycWithIneData')

const mockGetKycByUserId = getKycByUserId as jest.MockedFunction<typeof getKycByUserId>
const mockAnalyzeDocument = analyzeDocument as jest.MockedFunction<typeof analyzeDocument>
const mockGetEmployeeRfc = getEmployeeRfc as jest.MockedFunction<typeof getEmployeeRfc>
const mockUpdateKycWithIneData = updateKycWithIneData as jest.MockedFunction<typeof updateKycWithIneData>

const baseEvent: Partial<APIGatewayProxyEventV2> = {
  body: undefined,
  requestContext: {
    authorizer: { lambda: { userId: 'user-abc-123' } },
  } as never,
}

const mockKycRecord = {
  creditId: 'credit-xyz-456',
  userId: 'user-abc-123',
  step: 'INE_FRONT',
  s3Keys: { INE_FRONT: 'onboarding/2025/06/27/credit-xyz-456/INE_FRONT.jpg' },
  amount: 10000,
  term: 12,
  created_at: 1750000000,
  expires_at: 1751296000,
}

const mockIneData = {
  nombre: 'JUAN PEREZ GARCIA',
  curp: 'PEGJ970101HMCRRC09',
  fechaNacimiento: '01/01/1997',
  domicilio: 'CALLE REFORMA 123, COLONIA CENTRO, CDMX',
}

// RFC whose first 10 chars match CURP first 10 chars: PEGJ970101
const matchingRfc = 'PEGJ970101ABC'

describe('validateIneFront', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.KYC_TABLE_NAME = 'onboardingKycDBDev'
    process.env.S3_BUCKET_NAME = 'acamino-file-system-dev'
    process.env.DB_SECRET_ID = 'onboardingCredentialsDev'
    process.env.DEV_USER_ID = 'user-abc-123'
    mockGetKycByUserId.mockResolvedValue(mockKycRecord)
    mockAnalyzeDocument.mockResolvedValue(mockIneData)
    mockGetEmployeeRfc.mockResolvedValue(matchingRfc)
    mockUpdateKycWithIneData.mockResolvedValue(undefined)
  })

  it('should return 200 with errorCode 701 on valid INE front', async () => {
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

  it('should return 400 with errorCode 704 when step is not INE_FRONT', async () => {
    mockGetKycByUserId.mockResolvedValue({ ...mockKycRecord, step: 'CONDITIONS' })
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

  it('should return 400 with errorCode 702 when Textract returns missing fields', async () => {
    const { ValidationError } = await import('../../../../../shared/constants/errors')
    mockAnalyzeDocument.mockRejectedValue(new ValidationError('Missing required INE fields'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when CURP does not match RFC', async () => {
    mockGetEmployeeRfc.mockResolvedValue('XXXX000000YYZ')
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 705 when employee not found for user', async () => {
    const { NotFoundError } = await import('../../../../../shared/constants/errors')
    mockGetEmployeeRfc.mockRejectedValue(new NotFoundError('Employee not found for user'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(705)
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

  it('should return 400 with errorCode 708 when DB_SECRET_ID is not set', async () => {
    delete process.env.DB_SECRET_ID
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

  it('should return 400 with errorCode 708 when analyzeDocument throws a DB error', async () => {
    mockAnalyzeDocument.mockRejectedValue(new Error('connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when getEmployeeRfc throws a DB error', async () => {
    mockGetEmployeeRfc.mockRejectedValue(new Error('Error on getEmployeeRfc: connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when updateKycWithIneData throws a DB error', async () => {
    mockUpdateKycWithIneData.mockRejectedValue(new Error('connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })
})
