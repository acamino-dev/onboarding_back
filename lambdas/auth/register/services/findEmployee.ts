import { NotFoundError } from '../../../../shared/constants/errors'
import { getDb } from '../../../../shared/db/client'
import { dynamoDb } from '../../../../shared/db/dynamodb'
import type { Employee } from '../../../../shared/db/types'

export const findEmployee = async (employeeNumber: string, companyId: string, rfc: string): Promise<Employee> => {
  const tableName = process.env.COMPANIES_TABLE_NAME
  if (!tableName) {
    throw new Error('COMPANIES_TABLE_NAME environment variable not set')
  }

  const db = await getDb()

  try {
    const result = await dynamoDb.get({
      TableName: tableName,
      Key: { id: companyId },
    })

    if (!result.Item) {
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
  } catch (error) {
    if (error instanceof NotFoundError) throw error
    throw new Error(`Error on findEmployee: ${error instanceof Error ? error.message : String(error)}`)
  }
}
