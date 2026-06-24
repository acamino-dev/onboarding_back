export type Payment = {
  operationDate: string
  valueDate: string
  amount: string
  concept: string
  dueDate: string
  paymentType: string
  invoice: string
  capital: string
  interest: string
  iva: string
  total: string
}

export type CreditEntry = {
  creditId: string
  payments: Payment[]
}

export type CreditHistoryResult =
  | {
      history: true
      operator: boolean
      activeCredit: boolean
      balance: number
      company: string
      creditHistory: CreditEntry[]
      frequency: number
    }
  | {
      history: false
      operator: null
      activeCredit: null
      balance: null
      company: null
      creditHistory: null
      frequency: null
    }
