import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { lambdaHandler } from '../../app'
import { loginToPortal, buildConsultaUrl, buildCatPersonaUrl } from '../../services/portalLogin'
import { searchCreditsByRfc } from '../../services/searchCreditsByRfc'
import { fetchContractPayments } from '../../services/fetchContractPayments'
import { fetchEmployeeInfo } from '../../services/fetchEmployeeInfo'
import { fetchEmploymentData } from '../../services/fetchEmploymentData'
import { getSecret } from '../../../../../shared/utils/secrets'

jest.mock('../../services/portalLogin')
jest.mock('../../services/searchCreditsByRfc')
jest.mock('../../services/fetchContractPayments')
jest.mock('../../services/fetchEmployeeInfo')
jest.mock('../../services/fetchEmploymentData')
jest.mock('../../../../../shared/utils/secrets')

const mockLoginToPortal = loginToPortal as jest.MockedFunction<typeof loginToPortal>
const mockBuildConsultaUrl = buildConsultaUrl as jest.MockedFunction<typeof buildConsultaUrl>
const mockBuildCatPersonaUrl = buildCatPersonaUrl as jest.MockedFunction<typeof buildCatPersonaUrl>
const mockSearchCreditsByRfc = searchCreditsByRfc as jest.MockedFunction<typeof searchCreditsByRfc>
const mockFetchContractPayments = fetchContractPayments as jest.MockedFunction<typeof fetchContractPayments>
const mockFetchEmployeeInfo = fetchEmployeeInfo as jest.MockedFunction<typeof fetchEmployeeInfo>
const mockFetchEmploymentData = fetchEmploymentData as jest.MockedFunction<typeof fetchEmploymentData>
const mockGetSecret = getSecret as jest.MockedFunction<typeof getSecret>

const baseEvent: Partial<APIGatewayProxyEventV2> = {
  body: JSON.stringify({ rfc: 'GAMA850101H10' }),
  headers: { 'Content-Type': 'application/json' },
}

const mockRows = [
  { creditId: 'CRED-001', status: 'ACTIVO', balance: 5000, eventTarget: 'ctl00$lnkRegistro', fechaPrimerPago: '01/01/2023', fechaUltimoPago: '01/12/2023' },
]

const mockCreditEntries = [
  {
    creditId: 'CRED-001',
    periodicidad: 'QUINCENAL',
    payments: [
      {
        operationDate: '28/01/2024',
        valueDate: '08/11/2023',
        amount: '1,421.00',
        concept: 'PAGO 1   de 12',
        dueDate: '31/10/2023',
        paymentType: 'MANUAL',
        invoice: 'FCP   187',
        capital: '1,116.50',
        interest: '262.50',
        iva: '42.00',
        total: '1,421.00',
      },
    ],
  },
]

describe('getCreditHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.PORTAL_SECRET_ARN = 'onboardingTP'
    mockGetSecret.mockResolvedValue(
      JSON.stringify({ user: 'u', password: 'p', url: 'https://portal.example.com/login' })
    )
    mockLoginToPortal.mockResolvedValue('session=abc123')
    mockBuildConsultaUrl.mockReturnValue('https://portal.example.com/Migrado/su_conFinanciera.aspx')
    mockBuildCatPersonaUrl.mockReturnValue('https://portal.example.com/Migrado/su_catPersona.aspx')
    mockFetchEmployeeInfo.mockResolvedValue({
      empresa: 'EMPRESA TEST S.A. DE C.V.',
      mtoPersonaUrl: 'https://portal.example.com/Migrado/su_MtoPersona.aspx?id=123',
    })
    mockFetchEmploymentData.mockResolvedValue({ puesto: 'CAJERO', antiguedad: 24 })
    mockSearchCreditsByRfc.mockResolvedValue({
      rows: mockRows,
      viewState: 'vs',
      viewStateGenerator: 'vsg',
      clientCve: 'CVE1',
      clientNom: 'NOM1',
    })
    mockFetchContractPayments.mockResolvedValue(mockCreditEntries)
  })

  it('should return 200 with credit history on happy path', async () => {
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.history).toBe(true)
    expect(parsed.operator).toBe(false)
    expect(parsed.activeCredit).toBe(true)
    expect(parsed.balance).toBe(5000)
    expect(parsed.company).toBe('EMPRESA TEST S.A. DE C.V.')
    expect(parsed.frequency).toBe(0)
    expect(parsed.creditHistory).toHaveLength(1)
    expect(parsed.creditHistory[0].creditId).toBe('CRED-001')
    expect(parsed.creditHistory[0].payments).toHaveLength(1)
  })

  it('should return 200 with history false when RFC not found', async () => {
    mockSearchCreditsByRfc.mockResolvedValue({
      rows: [],
      viewState: '',
      viewStateGenerator: '',
      clientCve: '',
      clientNom: '',
    })
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.history).toBe(false)
    expect(parsed.operator).toBeNull()
    expect(parsed.activeCredit).toBeNull()
    expect(parsed.balance).toBeNull()
    expect(parsed.company).toBeNull()
    expect(parsed.frequency).toBeNull()
    expect(parsed.creditHistory).toBeNull()
  })

  it('should return 400 with errorCode 702 when RFC format is invalid', async () => {
    const event = { ...baseEvent, body: JSON.stringify({ rfc: 'INVALID123' }) }
    const result = await lambdaHandler(event as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when rfc field is missing', async () => {
    const event = { ...baseEvent, body: JSON.stringify({}) }
    const result = await lambdaHandler(event as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 703 when portal login fails', async () => {
    const { AuthError } = await import('../../../../../shared/constants/errors')
    mockLoginToPortal.mockRejectedValue(new AuthError('Portal login failed'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(703)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when PORTAL_SECRET_ARN is not set', async () => {
    delete process.env.PORTAL_SECRET_ARN
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when searchCreditsByRfc throws a scraping error', async () => {
    mockSearchCreditsByRfc.mockRejectedValue(
      new Error('Error on searchCreditsByRfc: connection timeout')
    )
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when fetchEmployeeInfo throws a scraping error', async () => {
    mockFetchEmployeeInfo.mockRejectedValue(
      new Error('Error on fetchEmployeeInfo: connection timeout')
    )
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when fetchEmploymentData throws a scraping error', async () => {
    mockFetchEmploymentData.mockRejectedValue(
      new Error('Error on fetchEmploymentData: connection timeout')
    )
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })
})
