import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { AuthError, ForbiddenError, ValidationError } from '../../../shared/constants/errors'
import { KYC_STEPS } from '../../../shared/constants/kyc'
import { createResponsePublic } from '../../../shared/utils/createResponse'
import { handleError } from '../../../shared/utils/handleError'
import { analyzeCurpDocument } from './services/analyzeCurpDocument'
import { getKycByUserId } from './services/getKycByUserId'
import { updateKycStep } from './services/updateKycStep'

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

    if (kycRecord.step !== KYC_STEPS.CURP) {
      throw new ForbiddenError(`Invalid step for CURP validation: ${kycRecord.step}`)
    }

    if (!kycRecord.s3Key) {
      throw new ValidationError('CURP document has not been uploaded')
    }

    if (!kycRecord.curp) {
      throw new ValidationError('KYC record missing CURP from INE front validation')
    }

    const extractedCurp = await analyzeCurpDocument(S3_BUCKET_NAME, kycRecord.s3Key)

    if (extractedCurp !== kycRecord.curp) {
      throw new ValidationError('CURP mismatch: document CURP does not match KYC record')
    }

    await updateKycStep(kycRecord.creditId, KYC_STEPS.BANK, KYC_TABLE_NAME)

    return createResponsePublic(200, { errorCode: 701 })
  } catch (e) {
    return handleError(e)
  }
}
