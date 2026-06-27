import { dynamoDb } from '../../../../shared/db/dynamodb'
import type { KycProcess } from '../types/KycProcess'

export const findKycProcess = async (userId: string, tableName: string): Promise<KycProcess | null> => {
  try {
    const result = await dynamoDb.query({
      TableName: tableName,
      IndexName: 'userId-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    })

    if (!result.Items || result.Items.length === 0) return null

    const item = result.Items[0]

    return {
      creditId: item['creditId'] as string,
      userId: item['userId'] as string,
      step: item['step'] as string,
      amount: item['amount'] as number,
      term: item['term'] as number,
      rate: item['rate'] as number,
      fullName: (item['fullName'] as string) ?? null,
      curp: (item['curp'] as string) ?? null,
      rfc: (item['rfc'] as string) ?? null,
      birthDate: (item['birthDate'] as string) ?? null,
      address: (item['address'] as string) ?? null,
      neighborhood: (item['neighborhood'] as string) ?? null,
      city: (item['city'] as string) ?? null,
      postalCode: (item['postalCode'] as string) ?? null,
      accountLast4: (item['accountLast4'] as string) ?? null,
    }
  } catch (error) {
    throw new Error(`Error on findKycProcess: ${error instanceof Error ? error.message : String(error)}`)
  }
}
