import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { lambdaHandler } from '../../app'
import { findEmployee } from '../../services/findEmployee'
import { checkUserExists } from '../../services/checkUserExists'
import { createUser } from '../../services/createUser'
import type { Employee } from '../../../../shared/db/types'

jest.mock('../../services/findEmployee')
jest.mock('../../services/checkUserExists')
jest.mock('../../services/createUser')

const mockFindEmployee = findEmployee as jest.MockedFunction<typeof findEmployee>
const mockCheckUserExists = checkUserExists as jest.MockedFunction<typeof checkUserExists>
const mockCreateUser = createUser as jest.MockedFunction<typeof createUser>

const mockEmployee: Employee = {
  id: '550e8400-e29b-41d4-a716-446655440010',
  employee_number: 'EMP001',
  rfc: 'GOAA970101AB1',
  company_id: '550e8400-e29b-41d4-a716-446655440000',
  is_active: true,
  created_at: new Date(),
}

const validBody = {
  employee_number: 'EMP001',
  company_id: '550e8400-e29b-41d4-a716-446655440000',
  rfc: 'GOAA970101AB1',
  email: 'john.doe@company.com',
  first_name: 'John',
  last_name: 'Doe',
  password: 'SecurePass123!',
}

const baseEvent: Partial<APIGatewayProxyEventV2> = {
  body: JSON.stringify(validBody),
  headers: { 'Content-Type': 'application/json' },
}

describe('register-service handler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.DB_SECRET_ID = 'onBoardingCredentialsDev'
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

  it('should return 400 with errorCode 702 when body is empty', async () => {
    const result = await lambdaHandler({ ...baseEvent, body: '' } as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 705 when employee is not found', async () => {
    const { NotFoundError } = await import('../../../../shared/constants/errors')
    mockFindEmployee.mockRejectedValue(new NotFoundError('Employee not found'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(705)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 709 when email is already registered', async () => {
    const { DuplicatedError } = await import('../../../../shared/constants/errors')
    mockCheckUserExists.mockRejectedValue(
      new DuplicatedError('Email already registered')
    )
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(709)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 702 when required fields are missing', async () => {
    const invalidBody = { employee_number: 'EMP001' }
    const result = await lambdaHandler({
      ...baseEvent,
      body: JSON.stringify(invalidBody),
    } as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(702)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when findEmployee throws a DB error', async () => {
    mockFindEmployee.mockRejectedValue(new Error('Error on findEmployee: connection timeout'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when checkUserExists throws a DB error', async () => {
    mockCheckUserExists.mockRejectedValue(new Error('Error on checkUserExists: query failed'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })

  it('should return 400 with errorCode 708 when createUser throws a DB error', async () => {
    mockCreateUser.mockRejectedValue(new Error('Error on createUser: insert failed'))
    const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
    const parsed = JSON.parse(result.body as string)
    expect(parsed.errorCode).toBe(708)
    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
  })
})
