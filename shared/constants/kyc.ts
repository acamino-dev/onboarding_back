export const KYC_STEPS = {
  CONDITIONS: 'CONDITIONS',
  INE_FRONT: 'INE_FRONT',
  INE_BACK: 'INE_BACK',
  ADDRESS: 'ADDRESS',
  CURP: 'CURP',
  BANK: 'BANK',
  REVIEW: 'REVIEW',
  BIOMETRIC: 'BIOMETRIC',
  STATUS: 'STATUS',
} as const

export type KycStep = (typeof KYC_STEPS)[keyof typeof KYC_STEPS]

export const MAX_CREDIT_AMOUNT = 35000
export const MIN_PLAZO_MONTHS = 3
export const KYC_TTL_DAYS = 15
