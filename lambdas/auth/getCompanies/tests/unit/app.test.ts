import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { lambdaHandler } from '../../app'
import { scanCompanies } from '../../services/scanCompanies'

jest.mock('../../services/scanCompanies')

const mockScanCompanies = scanCompanies as jest.MockedFunction<typeof scanCompanies>

const mockCompanies = [
  { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Acme Corp' },
  { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Globex Inc' },
]

const baseEvent: Partial<APIGatewayProxyEventV2> = {
  headers: { 'Content-Type': 'application/json' },
}

describe('getCompanies handler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.COMPANIES_TABLE_NAME = 'onboardingCompaniesDBdev'
    mockScanCompanies.mockResolvedValue(mockCompanies)
  })

  it('should return 200 with list of companies', async () => {
    const result: APIGatewayProxyStructuredResultV2 = await lambdaHandler(
      baseEvent as APIGatewayProxyEventV2
    )
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.companies).toEqual(mockCompanies)
  })

  it('should return 200 with empty array when no companies exist', async () => {
    mockScanCompanies.mockResolvedValue([])
    const result: APIGatewayProxyStructuredResultV2 = await lambdaHandler(
      baseEvent as APIGatewayProxyEventV2
    )
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.companies).toEqual([])
  })

  it('should return 400 with errorCode 708 when COMPANIES_TABLE_NAME is not set', async () => {
    delete process.env.COMPANIES_TABLE_NAME
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when scanCompanies throws a DB error', async () => {
    mockScanCompanies.mockRejectedValue(new Error('connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })
})
