import { NotFoundError } from '../../../../shared/constants/errors'
import { findEmployee } from '../../services/findEmployee'
import { EMPLOYEES, TEST_COMPANY_ID, TEST_TENANT_ID } from './helpers/constants'

describe('findEmployee integration', () => {
  it('returns the employee on happy path', async () => {
    const employee = await findEmployee(
      EMPLOYEES.active.employeeNumber,
      TEST_COMPANY_ID,
      TEST_TENANT_ID
    )

    expect(employee.id).toBe(EMPLOYEES.active.id)
    expect(employee.rfc).toBe(EMPLOYEES.active.rfc)
    expect(employee.email).toBe(EMPLOYEES.active.email)
    expect(employee.is_active).toBe(true)
  })

  it('throws NotFoundError when company does not exist', async () => {
    await expect(
      findEmployee(EMPLOYEES.active.employeeNumber, '00000000-0000-0000-0000-000000000001', TEST_TENANT_ID)
    ).rejects.toThrow(NotFoundError)
  })

  it('throws NotFoundError when employee number does not exist in the company', async () => {
    await expect(
      findEmployee('NONEXISTENT', TEST_COMPANY_ID, TEST_TENANT_ID)
    ).rejects.toThrow(NotFoundError)
  })

  it('throws NotFoundError when employee is inactive', async () => {
    await expect(
      findEmployee(EMPLOYEES.inactive.employeeNumber, TEST_COMPANY_ID, TEST_TENANT_ID)
    ).rejects.toThrow(NotFoundError)
  })
})
