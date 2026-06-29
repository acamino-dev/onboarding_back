import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { AuthError, ForbiddenError, ValidationError } from '../../../shared/constants/errors'
import { KYC_STEPS } from '../../../shared/constants/kyc'
import { createResponsePublic } from '../../../shared/utils/createResponse'
import { handleError } from '../../../shared/utils/handleError'
import { analyzeBankDocument } from './services/analyzeBankDocument'
import { getKycByUserId } from './services/getKycByUserId'
import { updateKycWithBankData } from './services/updateKycWithBankData'
import { normalizeNameForComparison } from './utils/nameNormalizer'

export const lambdaHandler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const KYC_TABLE_NAME = process.env.KYC_TABLE_NAME
    if (!KYC_TABLE_NAME) throw new Error('KYC_TABLE_NAME is not set')

    const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME
    if (!S3_BUCKET_NAME) throw new Error('S3_BUCKET_NAME is not set')

    const authContext = (
      event.requestContext as unknown as { authorizer?: { lambda?: Record<string, string> } }
    )?.authorizer?.lambda

    const userId = authContext?.userId || process.env.DEV_USER_ID
    if (!userId) throw new AuthError('Missing auth context')

    const kycRecord = await getKycByUserId(userId, KYC_TABLE_NAME)

    if (kycRecord.step !== KYC_STEPS.BANK) {
      throw new ForbiddenError(`Invalid step for bank validation: ${kycRecord.step}`)
    }

    const bankS3Key = kycRecord.s3Keys?.[KYC_STEPS.BANK]
    if (!bankS3Key) {
      throw new ValidationError('Bank statement has not been uploaded')
    }

    if (!kycRecord.fullName) {
      throw new ValidationError('KYC record missing fullName from INE front validation')
    }

    const bankData = await analyzeBankDocument(S3_BUCKET_NAME, bankS3Key)

    const normalizedExtracted = normalizeNameForComparison(bankData.nombre)
    const normalizedKyc = normalizeNameForComparison(kycRecord.fullName)

    if (normalizedExtracted !== normalizedKyc) {
      throw new ValidationError('Name mismatch: bank statement name does not match KYC record')
    }

    await updateKycWithBankData(kycRecord.creditId, bankData.numeroCuenta, KYC_TABLE_NAME)

    return createResponsePublic(200, { errorCode: 701 })
  } catch (e) {
    return handleError(e)
  }
}
