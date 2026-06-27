export const TEST_USER_ID = 'integration-user-validate-ine-001'
export const TEST_CREDIT_ID = 'a2b3c4d5-e6f7-8901-bcde-f12345678901'

export const TEST_KYC_RECORD = {
  creditId: TEST_CREDIT_ID,
  userId: TEST_USER_ID,
  step: 'CONDITIONS',
  s3Key: 'onboarding/2025/06/27/a2b3c4d5-e6f7-8901-bcde-f12345678901/INE_FRONT.jpg',
  amount: 10000,
  term: 12,
  expires_at: Math.floor(Date.now() / 1000) + 86400,
} as const

export const TEST_INE_DATA = {
  nombre: 'JUAN PEREZ GARCIA',
  curp: 'PEGJ970101HMCRRC09',
  fechaNacimiento: '01/01/1997',
  domicilio: 'CALLE REFORMA 123, COLONIA CENTRO, CDMX',
} as const
