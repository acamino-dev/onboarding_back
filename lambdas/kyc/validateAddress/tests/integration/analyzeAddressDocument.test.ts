import { analyzeAddressDocument } from '../../services/analyzeAddressDocument'

const BUCKET = process.env.S3_BUCKET_NAME as string

describe('analyzeAddressDocument integration', () => {
  it('throws wrapped Error when bucket does not exist', async () => {
    await expect(
      analyzeAddressDocument('nonexistent-bucket-xyz', 'onboarding/test/ADDRESS.jpg')
    ).rejects.toThrow(/Error on analyzeAddressDocument/)
  })

  it('throws wrapped Error when s3 key does not exist', async () => {
    await expect(
      analyzeAddressDocument(BUCKET, 'onboarding/nonexistent/ADDRESS.jpg')
    ).rejects.toThrow(/Error on analyzeAddressDocument/)
  })
})
