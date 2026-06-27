import { KYC_STEPS } from '../../../../shared/constants/kyc'
import { dynamoDb } from '../../../../shared/db/dynamodb'
import type { IneData } from '../types/IneData'

export const updateKycWithIneData = async (
  creditId: string,
  ineData: IneData,
  tableName: string
): Promise<void> => {
  try {
    await dynamoDb.update({
      TableName: tableName,
      Key: { creditId },
      UpdateExpression:
        'SET #step = :step, nombre = :nombre, curp = :curp, fechaNacimiento = :fechaNacimiento, domicilio = :domicilio',
      ExpressionAttributeNames: { '#step': 'step' },
      ExpressionAttributeValues: {
        ':step': KYC_STEPS.INE_FRONT,
        ':nombre': ineData.nombre,
        ':curp': ineData.curp,
        ':fechaNacimiento': ineData.fechaNacimiento,
        ':domicilio': ineData.domicilio,
      },
    })
  } catch (error) {
    throw new Error(
      `Error on updateKycWithIneData: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
