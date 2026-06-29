import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Client = new S3Client({})

export const generateUploadUrl = async (
  bucketName: string,
  s3Key: string,
  contentType: string,
  contentLength: number
): Promise<string> => {
  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      ContentType: contentType,
      ContentLength: contentLength,
    })

    return await getSignedUrl(s3Client, command, { expiresIn: 3600 })
  } catch (error) {
    throw new Error(`Error on generateUploadUrl: ${error instanceof Error ? error.message : String(error)}`)
  }
}
