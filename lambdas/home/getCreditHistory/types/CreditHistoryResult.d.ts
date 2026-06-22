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
      credit: string
      creditHistory: CreditEntry[]
    }
  | {
      history: false
      operator: null
      activeCredit: null
      balance: null
      credit: null
      creditHistory: null
    }
