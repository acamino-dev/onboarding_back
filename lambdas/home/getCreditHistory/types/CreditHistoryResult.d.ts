export type Payment = {
  operationDate: string
  dueDate: string
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
