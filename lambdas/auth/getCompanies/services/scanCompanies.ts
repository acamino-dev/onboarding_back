import { dynamoDb, type Company } from '../../../../shared/db/dynamodb'

export type CompanyItem = {
  id: string
  name: string
}

export const scanCompanies = async (tableName: string): Promise<CompanyItem[]> => {
  try {
    const result = await dynamoDb.scan({ TableName: tableName })
    const items = (result.Items ?? []) as Company[]
    return items.map(({ id, name }) => ({ id, name }))
  } catch (error) {
    throw new Error(
      `Error on scanCompanies: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
