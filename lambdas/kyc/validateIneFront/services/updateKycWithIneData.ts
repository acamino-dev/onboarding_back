import { KYC_STEPS } from '../../../../shared/constants/kyc'
import { dynamoDb } from '../../../../shared/db/dynamodb'
import type { IneData } from '../types/IneData'

export const updateKycWithIneData = async (
  creditId: string,
  ineData: IneData,
  rfc: string,
  tableName: string
): Promise<void> => {
  try {
    await dynamoDb.update({
      TableName: tableName,
      Key: { creditId },
      UpdateExpression:
        'SET #step = :step, fullName = :fullName, curp = :curp, rfc = :rfc, birthDate = :birthDate, #address = :address, neighborhood = :neighborhood, city = :city, postalCode = :postalCode',
      ExpressionAttributeNames: { '#step': 'step', '#address': 'address' },
      ExpressionAttributeValues: {
        ':step': KYC_STEPS.INE_BACK,
        ':fullName': ineData.nombre,
        ':curp': ineData.curp,
        ':rfc': rfc,
        ':birthDate': ineData.fechaNacimiento,
        ':address': ineData.domicilio,
        ':neighborhood': null,
        ':city': null,
        ':postalCode': null,
      },
    })
  } catch (error) {
    throw new Error(
      `Error on updateKycWithIneData: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
