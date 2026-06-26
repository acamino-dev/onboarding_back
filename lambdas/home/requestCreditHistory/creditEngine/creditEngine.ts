import type { CreditHistoryResult, ActiveCreditBalance, CreditEntry, Payment } from '../types/CreditHistoryResult'
import {
  MAX_CREDIT_AMOUNT,
  NO_HISTORY_OFFER,
  OFFER_BRACKETS,
  COMPANY_SCORES,
  DEFAULT_COMPANY_SCORE,
  ACAMINO_TENURE_THRESHOLDS,
  LABOR_SENIORITY_THRESHOLDS,
  FREQUENCY_THRESHOLDS,
  CREDIT_COUNT_THRESHOLDS,
  type Threshold,
  type OfferBracket,
} from './config'

export type ScoreBreakdown = {
  creditCount: number
  acaminoTenure: number
  frequency: number
  company: number
  laborSeniority: number
}

export type CreditOffer = {
  amount: number
  tasa: number
  plazo: number
}

export type CreditEngineResult = {
  score: number
  breakdown: ScoreBreakdown
  offer: CreditOffer
}

const scoreFromThresholds = (value: number, thresholds: readonly Threshold[]): number => {
  for (const t of thresholds) {
    if (value >= t.min) return t.score
  }
  return 0
}

const scoreFrequency = (months: number): number => {
  for (const t of FREQUENCY_THRESHOLDS) {
    if (months <= t.maxMonths) return t.score
  }
  return 0
}

const scoreCompany = (company: string): number =>
  COMPANY_SCORES[company.trim()] ?? DEFAULT_COMPANY_SCORE

const parseCapital = (s: string): number => parseFloat(s.replace(/,/g, '')) || 0

const computeMaxHistoricalAmount = (input: Extract<CreditHistoryResult, { history: true }>): number => {
  const activeCreditIds = new Set(input.balance.map((b: ActiveCreditBalance): string => b.creditId))

  const maxActiveBalance = input.balance.reduce(
    (max: number, b: ActiveCreditBalance): number => Math.max(max, b.balance),
    0
  )

  const maxLiquidatedAmount = input.creditHistory
    .filter((e: CreditEntry): boolean => !activeCreditIds.has(e.creditId))
    .reduce((max: number, entry: CreditEntry): number => {
      const total = entry.payments.reduce(
        (sum: number, p: Payment): number => sum + parseCapital(p.capital),
        0
      )
      return Math.max(max, total)
    }, 0)

  return Math.max(maxActiveBalance, maxLiquidatedAmount)
}

const computeOffer = (score: number, maxAmount: number): CreditOffer => {
  const bracket = OFFER_BRACKETS.find(
    (b: OfferBracket): boolean => score >= b.minScore && score <= b.maxScore
  )

  if (!bracket) return NO_HISTORY_OFFER

  if (bracket.multiplier !== null) {
    const amount = Math.min(Math.round(maxAmount * bracket.multiplier), MAX_CREDIT_AMOUNT)
    return { amount, tasa: bracket.tasa, plazo: bracket.plazo }
  }

  return { amount: bracket.fixedAmount!, tasa: bracket.tasa, plazo: bracket.plazo }
}

export const creditEngine = (input: CreditHistoryResult): CreditEngineResult => {
  if (!input.history) {
    return {
      score: 0,
      breakdown: { creditCount: 0, acaminoTenure: 0, frequency: 0, company: 0, laborSeniority: 0 },
      offer: NO_HISTORY_OFFER,
    }
  }

  const role: 'operador' | 'admin' = input.operator ? 'operador' : 'admin'

  const activeCreditIds = new Set(input.balance.map((b: ActiveCreditBalance): string => b.creditId))
  const liquidatedCount = input.creditHistory.filter(
    (e: CreditEntry): boolean => !activeCreditIds.has(e.creditId)
  ).length

  const breakdown: ScoreBreakdown = {
    creditCount: scoreFromThresholds(liquidatedCount, CREDIT_COUNT_THRESHOLDS),
    acaminoTenure: scoreFromThresholds(input.acaminoTenure ?? 0, ACAMINO_TENURE_THRESHOLDS[role]),
    frequency: scoreFrequency(input.frequency ?? Infinity),
    company: scoreCompany(input.company ?? ''),
    laborSeniority: scoreFromThresholds(input.antiguedad ?? 0, LABOR_SENIORITY_THRESHOLDS[role]),
  }

  const score = Object.values(breakdown).reduce((sum: number, v: number): number => sum + v, 0)

  const maxAmount = computeMaxHistoricalAmount(input)
  const offer = computeOffer(score, maxAmount)

  return { score, breakdown, offer }
}
