export const MAX_CREDIT_AMOUNT = 35_000

export const NO_HISTORY_OFFER = { amount: 3_000, tasa: 150, plazo: 3 } as const

export type OfferBracket = {
  minScore: number
  maxScore: number
  multiplier: number | null
  fixedAmount: number | null
  tasa: number
  plazo: number
}

export const OFFER_BRACKETS: readonly OfferBracket[] = [
  { minScore: 30, maxScore: 30, multiplier: 1.1,  fixedAmount: null,  tasa: 120, plazo: 12 },
  { minScore: 20, maxScore: 29, multiplier: 1.08, fixedAmount: null,  tasa: 126, plazo: 12 },
  { minScore: 10, maxScore: 19, multiplier: 1.06, fixedAmount: null,  tasa: 133, plazo: 9  },
  { minScore: 5,  maxScore: 9,  multiplier: 1.03, fixedAmount: null,  tasa: 141, plazo: 6  },
  { minScore: 1,  maxScore: 4,  multiplier: null, fixedAmount: 3_000, tasa: 150, plazo: 3  },
]

export const COMPANY_SCORES: Readonly<Record<string, number>> = {
  'OMNIBUS DE MÉXICO, S.A. DE C.V.': 5,
  'COMERCIALIZACIÓN Y SERVICIOS DEL PONIENTE S.A. DE CV': 4,
  'AUTOTRANSPORTES DE PASAJEROS MEXICO TOLUCA SAN LUIS MEXTEPEC QUERETARO FLECHA ROJA, S.A. DE C.V.': 3,
  'AUTOTRANSPORTES VALLE DEL MEZQUITAL S.A. DE C.V.': 1,
}

export const DEFAULT_COMPANY_SCORE = 1

// { min (inclusive), score } — checked from highest to lowest
export type Threshold = { min: number; score: number }

export const ACAMINO_TENURE_THRESHOLDS: Readonly<Record<'operador' | 'admin', readonly Threshold[]>> = {
  operador: [
    { min: 60, score: 5 },
    { min: 48, score: 4 },
    { min: 36, score: 3 },
    { min: 24, score: 2 },
    { min: 12, score: 1 },
    { min: 0,  score: 0 },
  ],
  admin: [
    { min: 48, score: 5 },
    { min: 36, score: 4 },
    { min: 24, score: 3 },
    { min: 12, score: 2 },
    { min: 7,  score: 1 },
    { min: 0,  score: 0 },
  ],
}

export const LABOR_SENIORITY_THRESHOLDS: Readonly<Record<'operador' | 'admin', readonly Threshold[]>> = {
  operador: [
    { min: 73, score: 5 },
    { min: 37, score: 4 },
    { min: 25, score: 3 },
    { min: 13, score: 2 },
    { min: 7,  score: 1 },
    { min: 0,  score: 0 },
  ],
  admin: [
    { min: 61, score: 5 },
    { min: 37, score: 4 },
    { min: 25, score: 3 },
    { min: 13, score: 2 },
    { min: 7,  score: 1 },
    { min: 0,  score: 0 },
  ],
}

// { maxMonths (inclusive), score } — checked from lowest to highest; > last max → 0
export type FrequencyThreshold = { maxMonths: number; score: number }

export const FREQUENCY_THRESHOLDS: readonly FrequencyThreshold[] = [
  { maxMonths: 1,  score: 5 },
  { maxMonths: 5,  score: 3 },
  { maxMonths: 8,  score: 2 },
  { maxMonths: 11, score: 1 },
]

export const CREDIT_COUNT_THRESHOLDS: readonly Threshold[] = [
  { min: 6, score: 5 },
  { min: 5, score: 4 },
  { min: 3, score: 3 },
  { min: 2, score: 2 },
  { min: 1, score: 1 },
  { min: 0, score: 0 },
]
