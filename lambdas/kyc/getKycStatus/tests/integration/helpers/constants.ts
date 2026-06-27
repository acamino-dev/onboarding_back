export const TEST_USER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
export const TEST_CREDIT_ID = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'

export const TEST_KYC_ITEM = {
  creditId: TEST_CREDIT_ID,
  userId: TEST_USER_ID,
  step: 'CONDITIONS',
  amount: 10000,
  term: 12,
  rate: 0.15,
  fullName: 'Juan García López',
  curp: 'GALJ970101HDFRCN01',
} as const
