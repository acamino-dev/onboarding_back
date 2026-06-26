import type { ActiveCreditBalance } from './CreditHistoryResult'
import type { CreditEngineResult } from '../creditEngine/creditEngine'

export type ActiveCreditResponse = {
  type: 'active_credit'
  balance: ActiveCreditBalance[]
  analyzedAt: string
}

export type OfferResponse = {
  type: 'offer'
  creditOffer: CreditEngineResult
  analyzedAt: string
}

export type AnalysisResponse = ActiveCreditResponse | OfferResponse
