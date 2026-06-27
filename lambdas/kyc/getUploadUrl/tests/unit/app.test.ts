import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { NotFoundError } from '../../../../../shared/constants/errors'
import { lambdaHandler } from '../../app'
import { getKycByUserId } from '../../services/getKycByUserId'
import { generateUploadUrl } from '../../services/generateUploadUrl'
import { saveS3Key } from '../../services/saveS3Key'

jest.mock('../../services/getKycByUserId')
jest.mock('../../services/generateUploadUrl')
jest.mock('../../services/saveS3Key')

const mockGetKycByUserId = getKycByUserId as jest.MockedFunction<typeof getKycByUserId>
const mockGenerateUploadUrl = generateUploadUrl as jest.MockedFunction<typeof generateUploadUrl>
const mockSaveS3Key = saveS3Key as jest.MockedFunction<typeof saveS3Key>

const TEST_USER_ID = 'user-test-abc-001'

const baseEvent: Partial<APIGatewayProxyEventV2> = {
  requestContext: {
    authorizer: { lambda: { userId: TEST_USER_ID } },
  } as unknown as APIGatewayProxyEventV2['requestContext'],
  body: JSON.stringify({ contentType: 'image/jpeg' }),
}

const noAuthEvent: Partial<APIGatewayProxyEventV2> = {
  requestContext: {
    authorizer: { lambda: {} },
  } as unknown as APIGatewayProxyEventV2['requestContext'],
  body: JSON.stringify({ contentType: 'image/jpeg' }),
}

const kycRecord = {
  creditId: 'credit-test-uuid-001',
  userId: TEST_USER_ID,
  step: 'INE_FRONT',
  amount: 10000,
  term: 12,
  created_at: 1750000000,
  expires_at: 1752000000,
}

const MOCK_UPLOAD_URL = 'https://acamino-file-system-dev.s3.amazonaws.com/presigned-url'

describe('getUploadUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.KYC_TABLE_NAME = 'onboardingKycDBDev'
    process.env.S3_BUCKET_NAME = 'acamino-file-system-dev'
    delete process.env.DEV_USER_ID
    mockGetKycByUserId.mockResolvedValue(kycRecord)
    mockGenerateUploadUrl.mockResolvedValue(MOCK_UPLOAD_URL)
    mockSaveS3Key.mockResolvedValue(undefined)
  })

  it('should return 200 with uploadUrl, s3Key, step and creditId on happy path', async () => {
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.uploadUrl).toBe(MOCK_UPLOAD_URL)
    expect(parsed.s3Key).toMatch(/^onboarding\/\d{4}\/\d{2}\/\d{2}\/credit-test-uuid-001\/INE_FRONT\.jpg$/)
    expect(parsed.step).toBe('INE_FRONT')
    expect(parsed.creditId).toBe('credit-test-uuid-001')
  })

  it('should return 200 using DEV_USER_ID when authorizer does not inject userId (local dev)', async () => {
    process.env.DEV_USER_ID = TEST_USER_ID
    const result = await lambdaHandler(noAuthEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.uploadUrl).toBe(MOCK_UPLOAD_URL)
  })

  it('should return 400 with errorCode 703 when authorizer missing and DEV_USER_ID not set', async () => {
    const result = await lambdaHandler(noAuthEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(703)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when contentType is missing', async () => {
    const event = { ...baseEvent, body: JSON.stringify({}) }
    const result = await lambdaHandler(event as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when contentType is not allowed', async () => {
    const event = { ...baseEvent, body: JSON.stringify({ contentType: 'video/mp4' }) }
    const result = await lambdaHandler(event as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 705 when no KYC record found for userId', async () => {
    mockGetKycByUserId.mockRejectedValue(new NotFoundError('KYC process not found'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(705)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 704 when step is CONDITIONS', async () => {
    mockGetKycByUserId.mockResolvedValue({ ...kycRecord, step: 'CONDITIONS' })
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(704)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 704 when step is BIOMETRIC', async () => {
    mockGetKycByUserId.mockResolvedValue({ ...kycRecord, step: 'BIOMETRIC' })
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(704)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 704 when step is REVIEW', async () => {
    mockGetKycByUserId.mockResolvedValue({ ...kycRecord, step: 'REVIEW' })
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(704)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 704 when step is STATUS', async () => {
    mockGetKycByUserId.mockResolvedValue({ ...kycRecord, step: 'STATUS' })
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(704)
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
    mockGetKycByUserId.mockRejectedValue(new Error('Error on getKycByUserId: connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when generateUploadUrl throws', async () => {
    mockGenerateUploadUrl.mockRejectedValue(new Error('Error on generateUploadUrl: S3 error'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when saveS3Key throws a DB error', async () => {
    mockSaveS3Key.mockRejectedValue(new Error('Error on saveS3Key: connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })
})
