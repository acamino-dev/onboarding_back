import { NotFoundError } from '../../../../shared/constants/errors'
import { getDb } from '../../../../shared/db/client'
import type { Employee } from '../../../../shared/db/types'

export const findEmployee = async (
  employeeNumber: string,
  companyId: string,
  rfc: string
): Promise<Employee> => {
  try {
    const db = await getDb()

    const company = await db.queryOne<{ id: string }>(
      'SELECT id FROM companies WHERE id = $1',
      [companyId]
    )

    if (!company) throw new NotFoundError('Company not found')

    const employee = await db.queryOne<Employee>(
      'SELECT * FROM employees WHERE employee_number = $1 AND company_id = $2 AND rfc = $3 AND is_active = TRUE',
      [employeeNumber, companyId, rfc]
    )

    if (!employee) throw new NotFoundError('Employee not found')

    return employee
  } catch (e) {
    if (e instanceof NotFoundError) throw e
    throw new Error(`Error on findEmployee: ${e}`)
  }
}
