import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { AuthError, ForbiddenError } from '../../../shared/constants/errors'
import { KYC_STEPS } from '../../../shared/constants/kyc'
import { createResponsePublic } from '../../../shared/utils/createResponse'
import { handleError } from '../../../shared/utils/handleError'
import { generateUploadUrl } from './services/generateUploadUrl'
import { getKycByUserId } from './services/getKycByUserId'
import { validateBody } from './utils/validators'

const UPLOADABLE_STEPS = new Set(['INE_FRONT', 'INE_BACK', 'ADDRESS', 'CURP', 'BANK'])
const KYC_STEPS_ORDER = Object.values(KYC_STEPS)

const CONTENT_TYPE_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf',
}

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

    const body = validateBody(event.body ?? '')

    const kycRecord = await getKycByUserId(userId, KYC_TABLE_NAME)

    const nextStepIndex = KYC_STEPS_ORDER.indexOf(kycRecord.step as typeof KYC_STEPS_ORDER[number])
    const currentStep = nextStepIndex > 0 ? KYC_STEPS_ORDER[nextStepIndex - 1] : undefined

    if (!currentStep || !UPLOADABLE_STEPS.has(currentStep)) {
      throw new ForbiddenError(`Step ${currentStep ?? kycRecord.step} does not require a document upload`)
    }

    const date = new Date(kycRecord.created_at * 1000)
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    const ext = CONTENT_TYPE_TO_EXT[body.contentType]
    const s3Key = `onboarding/${year}/${month}/${day}/${kycRecord.creditId}/${currentStep}.${ext}`

    const uploadUrl = await generateUploadUrl(S3_BUCKET_NAME, s3Key, body.contentType)

    return createResponsePublic(200, {
      uploadUrl,
      s3Key,
      step: currentStep,
      creditId: kycRecord.creditId,
    })
  } catch (e) {
    return handleError(e)
  }
}
