import { NotFoundError } from '../../../../shared/constants/errors'
import { getDb } from '../../../../shared/db/client'
import type { Employee } from '../../../../shared/db/types'

export const findEmployee = async (employeeNumber: string, companyId: string, rfc: string): Promise<Employee> => {
  const db = await getDb()

  const company = await db.queryOne<{ id: string }>('SELECT id FROM companies WHERE id = $1', [companyId])

  if (!company) {
    throw new NotFoundError('Company not found', {
      file: 'lambdas/auth/register/services/findEmployee.ts',
      function: 'findEmployee',
      operation: 'validate company existence',
      companyId,
    })
  }

  const employee = await db.queryOne<Employee>(
    'SELECT * FROM employees WHERE employee_number = $1 AND company_id = $2 AND rfc = $3 AND is_active = TRUE',
    [employeeNumber, companyId, rfc]
  )

  if (!employee) {
    throw new NotFoundError('Employee not found', {
      file: 'lambdas/auth/register/services/findEmployee.ts',
      function: 'findEmployee',
      operation: 'find active employee',
      employeeNumber,
      companyId,
    })
  }

  return employee
}
