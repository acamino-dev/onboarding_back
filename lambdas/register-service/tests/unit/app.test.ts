import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { lambdaHandler } from '../../app'
import { getSecret } from '../../../../shared/utils/secrets'
import { findEmployee } from '../../services/findEmployee'
import { checkUserExists } from '../../services/checkUserExists'
import { createUser } from '../../services/createUser'

jest.mock('../../../../shared/utils/secrets')
jest.mock('../../services/findEmployee')
jest.mock('../../services/checkUserExists')
jest.mock('../../services/createUser')

const mockGetSecret = getSecret as jest.MockedFunction<typeof getSecret>
const mockFindEmployee = findEmployee as jest.MockedFunction<typeof findEmployee>
const mockCheckUserExists = checkUserExists as jest.MockedFunction<typeof checkUserExists>
const mockCreateUser = createUser as jest.MockedFunction<typeof createUser>

const mockEmployee = {
  id: '550e8400-e29b-41d4-a716-446655440010',
  employeeNumber: 'EMP001',
  rfc: 'GOAA970101AB1',
  companyId: '550e8400-e29b-41d4-a716-446655440000',
  tenantId: '550e8400-e29b-41d4-a716-446655440001',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@company.com',
  isActive: true,
  createdAt: new Date(),
}

const validBody = {
  employee_number: 'EMP001',
  rfc: 'GOAA970101AB1',
  company_id: '550e8400-e29b-41d4-a716-446655440000',
  tenant_id: '550e8400-e29b-41d4-a716-446655440001',
  password: 'SecurePass123!',
}

const baseEvent: Partial<APIGatewayProxyEventV2> = {
  body: JSON.stringify(validBody),
  headers: { 'Content-Type': 'application/json' },
}

describe('register-service handler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.DB_SECRET_ARN = 'arn:aws:secretsmanager:us-east-1:123456789:secret:onboarding/db'
    mockGetSecret.mockResolvedValue(
      JSON.stringify({ connectionString: 'postgresql://localhost/test' })
    )
    mockFindEmployee.mockResolvedValue(mockEmployee)
    mockCheckUserExists.mockResolvedValue(undefined)
    mockCreateUser.mockResolvedValue(undefined)
  })

  it('should return 201 when registration is successful', async () => {
    const result: APIGatewayProxyStructuredResultV2 = await lambdaHandler(
      baseEvent as APIGatewayProxyEventV2
    )
    expect(result.statusCode).toBe(201)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.message).toBe('Account created successfully')
  })

  it('should return 200 with errorCode 702 when body is empty', async () => {
    const result = await lambdaHandler({ ...baseEvent, body: '' } as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 200 with errorCode 702 when RFC does not match employee record', async () => {
    mockFindEmployee.mockResolvedValue({ ...mockEmployee, rfc: 'DIFF970101AB1' })
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 200 with errorCode 705 when employee is not found', async () => {
    const { NotFoundError } = await import('../../../../shared/constants/errors')
    mockFindEmployee.mockRejectedValue(new NotFoundError('Employee not found'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(705)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 200 with errorCode 709 when user is already registered', async () => {
    const { DuplicatedError } = await import('../../../../shared/constants/errors')
    mockCheckUserExists.mockRejectedValue(
      new DuplicatedError('User already registered for this employee')
    )
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(709)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 200 with errorCode 702 when required fields are missing', async () => {
    const invalidBody = { employee_number: 'EMP001' }
    const result = await lambdaHandler({
      ...baseEvent,
      body: JSON.stringify(invalidBody),
    } as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(200)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })
})
