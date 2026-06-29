import { analyzeBankDocument } from '../../services/analyzeBankDocument'

const BUCKET = process.env.S3_BUCKET_NAME as string
const BANK_KEY = 'onboarding/2026/06/28/1b187669-a0a0-4f2a-9fff-cf64530ac093/BANK.pdf'

describe('analyzeBankDocument integration', () => {
  it('extracts nombre and numeroCuenta from real bank statement', async () => {
    const result = await analyzeBankDocument(BUCKET, BANK_KEY)

    expect(typeof result.nombre).toBe('string')
    expect(result.nombre.length).toBeGreaterThan(0)

    expect(typeof result.numeroCuenta).toBe('string')
    expect(result.numeroCuenta.length).toBeGreaterThan(0)

    console.log('Extracted bank data:', result)
  })
})
