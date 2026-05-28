import bcrypt from 'bcrypt'
import { eq } from 'drizzle-orm'
import { users } from '../../../../shared/db/schema'
import { createUser } from '../../services/createUser'
import { EMPLOYEES, TEST_COMPANY_ID, TEST_TENANT_ID } from './helpers/constants'
import { getTestDb } from './helpers/db'

const { db, connectionString } = getTestDb()

const testEmployee = {
  id: EMPLOYEES.forCreate.id,
  email: EMPLOYEES.forCreate.email,
  companyId: TEST_COMPANY_ID,
}

const testBody = {
  employee_number: EMPLOYEES.forCreate.employeeNumber,
  rfc: EMPLOYEES.forCreate.rfc,
  company_id: TEST_COMPANY_ID,
  tenant_id: TEST_TENANT_ID,
  password: 'IntegrationPass123!',
}

describe('createUser integration', () => {
  afterEach(async () => {
    await db.delete(users).where(eq(users.employeeId, EMPLOYEES.forCreate.id))
  })

  it('inserts a user row with a valid bcrypt password hash', async () => {
    await createUser(testEmployee, testBody, connectionString)

    const [inserted] = await db.select().from(users).where(eq(users.employeeId, EMPLOYEES.forCreate.id))

    expect(inserted).toBeDefined()
    expect(inserted.email).toBe(EMPLOYEES.forCreate.email)
    expect(inserted.tenantId).toBe(TEST_TENANT_ID)
    expect(inserted.companyId).toBe(TEST_COMPANY_ID)
    expect(await bcrypt.compare('IntegrationPass123!', inserted.passwordHash)).toBe(true)
  })

  it('throws a wrapped Error when employeeId violates the FK constraint', async () => {
    const nonExistentEmployee = { id: '00000000-0000-0000-0000-000000000000', email: 'x@x.com', companyId: TEST_COMPANY_ID }

    await expect(createUser(nonExistentEmployee, testBody, connectionString)).rejects.toThrow(
      /Error on createUser/
    )
  })
})
