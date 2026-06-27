import { generateUploadUrl } from '../../services/generateUploadUrl'

const BUCKET_NAME = process.env.S3_BUCKET_NAME as string
const TEST_S3_KEY = 'onboarding/2026/06/27/integration-test-credit/INE_FRONT.jpg'

describe('generateUploadUrl integration', () => {
  it('returns a valid presigned S3 URL for image/jpeg', async () => {
    const url = await generateUploadUrl(BUCKET_NAME, TEST_S3_KEY, 'image/jpeg')
    expect(typeof url).toBe('string')
    expect(url).toMatch(/^https:\/\//)
    expect(url).toContain(BUCKET_NAME)
    expect(url).toContain('X-Amz-Signature')
  })

  it('url contains expected bucket and key', async () => {
    const url = await generateUploadUrl(BUCKET_NAME, TEST_S3_KEY, 'image/jpeg')
    expect(url).toContain(BUCKET_NAME)
    expect(url).toContain(encodeURIComponent(TEST_S3_KEY).replace(/%2F/g, '/'))
  })
})
