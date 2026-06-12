import bcrypt from 'bcryptjs'
import type { User } from '../../../../../shared/db/types'
import { getDb } from '../../../../../shared/db/client'
import { createUser } from '../../services/createUser'
import { EMPLOYEES, TEST_COMPANY_ID } from './helpers/constants'

const testEmployee = {
  id: EMPLOYEES.forCreate.id,
  company_id: TEST_COMPANY_ID,
}

const testBody = {
  employee_number: EMPLOYEES.forCreate.employeeNumber,
  company_id: TEST_COMPANY_ID,
  rfc: EMPLOYEES.forCreate.rfc,
  email: EMPLOYEES.forCreate.email,
  password: 'IntegrationPass123!',
}

describe('createUser integration', () => {
  afterEach(async () => {
    const db = await getDb()
    await db.query('DELETE FROM users WHERE employee_id = $1', [EMPLOYEES.forCreate.id])
  })

  it('inserts a user row with a valid bcrypt password hash', async () => {
    await createUser(testEmployee, testBody)

    const db = await getDb()
    const inserted = await db.queryOne<User>('SELECT * FROM users WHERE employee_id = $1', [EMPLOYEES.forCreate.id])

    expect(inserted).toBeDefined()
    expect(inserted?.email).toBe(EMPLOYEES.forCreate.email)
    expect(inserted?.company_id).toBe(TEST_COMPANY_ID)
    expect(inserted?.password_hash).toBeDefined()
  })

  it('throws a wrapped Error when employeeId violates the FK constraint', async () => {
    const nonExistentEmployee = { id: '00000000-0000-0000-0000-000000000000', company_id: TEST_COMPANY_ID }

    await expect(createUser(nonExistentEmployee, testBody)).rejects.toThrow(
      /Error on createUser/
    )
  })
})
