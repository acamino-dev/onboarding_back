import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { lambdaHandler } from '../../app'
import { getKycByUserId } from '../../services/getKycByUserId'
import { saveKycReviewInfo } from '../../services/saveKycReviewInfo'
import { ForbiddenError, NotFoundError } from '../../../../../shared/constants/errors'

jest.mock('../../services/getKycByUserId')
jest.mock('../../services/saveKycReviewInfo')

const mockGetKycByUserId = getKycByUserId as jest.MockedFunction<typeof getKycByUserId>
const mockSaveKycReviewInfo = saveKycReviewInfo as jest.MockedFunction<typeof saveKycReviewInfo>

const validBody = {
  clabe: '032180000118359719',
  references: [
    { relation: 'Hermano', fullName: 'Carlos Ramirez', phoneNumber: '5512345678' },
    { relation: 'Amigo', fullName: 'Ana Lopez', phoneNumber: '5598765432' },
  ],
}

const baseEvent: Partial<APIGatewayProxyEventV2> = {
  body: JSON.stringify(validBody),
  headers: { 'Content-Type': 'application/json' },
  requestContext: {
    authorizer: { lambda: { userId: 'user-abc-123' } },
  } as unknown as APIGatewayProxyEventV2['requestContext'],
}

const kycRecord = {
  creditId: 'credit-xyz-456',
  userId: 'user-abc-123',
  step: 'REVIEW',
  amount: 10000,
  term: 6,
  created_at: 1700000000,
  expires_at: 1700086400,
}

describe('reviewInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.KYC_TABLE_NAME = 'onboardingKycDBDev'
    mockGetKycByUserId.mockResolvedValue(kycRecord)
    mockSaveKycReviewInfo.mockResolvedValue(undefined)
  })

  it('should return 200 with errorCode 701 when review info is saved successfully', async () => {
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(701)
  })

  it('should return 400 with errorCode 702 when body is missing', async () => {
    const result = await lambdaHandler({ ...baseEvent, body: undefined } as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when clabe is not 18 digits', async () => {
    const result = await lambdaHandler({
      ...baseEvent,
      body: JSON.stringify({ ...validBody, clabe: '12345' }),
    } as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when clabe contains non-numeric characters', async () => {
    const result = await lambdaHandler({
      ...baseEvent,
      body: JSON.stringify({ ...validBody, clabe: '03218000011835971X' }),
    } as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when fullName has non-alphabetic characters', async () => {
    const result = await lambdaHandler({
      ...baseEvent,
      body: JSON.stringify({
        ...validBody,
        references: [
          { relation: 'Hermano', fullName: 'Carlos123 Ramirez', phoneNumber: '5512345678' },
          { relation: 'Amigo', fullName: 'Ana Lopez', phoneNumber: '5598765432' },
        ],
      }),
    } as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when fullName is a single word', async () => {
    const result = await lambdaHandler({
      ...baseEvent,
      body: JSON.stringify({
        ...validBody,
        references: [
          { relation: 'Hermano', fullName: 'Carlos', phoneNumber: '5512345678' },
          { relation: 'Amigo', fullName: 'Ana Lopez', phoneNumber: '5598765432' },
        ],
      }),
    } as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when fullName word has no vowels', async () => {
    const result = await lambdaHandler({
      ...baseEvent,
      body: JSON.stringify({
        ...validBody,
        references: [
          { relation: 'Hermano', fullName: 'Crls Ramirez', phoneNumber: '5512345678' },
          { relation: 'Amigo', fullName: 'Ana Lopez', phoneNumber: '5598765432' },
        ],
      }),
    } as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when fullName contains keyboard walk', async () => {
    const result = await lambdaHandler({
      ...baseEvent,
      body: JSON.stringify({
        ...validBody,
        references: [
          { relation: 'Hermano', fullName: 'Qwerty Lopez', phoneNumber: '5512345678' },
          { relation: 'Amigo', fullName: 'Ana Lopez', phoneNumber: '5598765432' },
        ],
      }),
    } as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when phoneNumber is not 10 digits', async () => {
    const result = await lambdaHandler({
      ...baseEvent,
      body: JSON.stringify({
        ...validBody,
        references: [
          { relation: 'Hermano', fullName: 'Carlos Ramirez', phoneNumber: '123' },
          { relation: 'Amigo', fullName: 'Ana Lopez', phoneNumber: '5598765432' },
        ],
      }),
    } as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when references has only 1 item', async () => {
    const result = await lambdaHandler({
      ...baseEvent,
      body: JSON.stringify({
        ...validBody,
        references: [{ relation: 'Hermano', fullName: 'Carlos Ramirez', phoneNumber: '5512345678' }],
      }),
    } as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when references has more than 2 items', async () => {
    const result = await lambdaHandler({
      ...baseEvent,
      body: JSON.stringify({
        ...validBody,
        references: [
          { relation: 'Hermano', fullName: 'Carlos Ramirez', phoneNumber: '5512345678' },
          { relation: 'Amigo', fullName: 'Ana Lopez', phoneNumber: '5598765432' },
          { relation: 'Vecino', fullName: 'Pedro Martinez', phoneNumber: '5567891234' },
        ],
      }),
    } as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 703 when auth context is missing', async () => {
    const result = await lambdaHandler({
      ...baseEvent,
      requestContext: {} as unknown as APIGatewayProxyEventV2['requestContext'],
    } as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(703)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 704 when KYC step is not REVIEW', async () => {
    mockGetKycByUserId.mockResolvedValue({ ...kycRecord, step: 'OTP' })
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(704)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 705 when KYC process is not found', async () => {
    mockGetKycByUserId.mockRejectedValue(new NotFoundError('KYC process not found'))
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

  it('should return 400 with errorCode 708 when getKycByUserId throws a DB error', async () => {
    mockGetKycByUserId.mockRejectedValue(new Error('connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when saveKycReviewInfo throws a DB error', async () => {
    mockSaveKycReviewInfo.mockRejectedValue(new Error('connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })
})
