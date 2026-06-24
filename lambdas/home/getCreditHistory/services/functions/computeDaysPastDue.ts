import type { CreditEntry } from '../../types/CreditHistoryResult'

const parseDate = (dateStr: string): Date | null => {
  const parts = dateStr.split('/')
  if (parts.length !== 3) return null
  const [day, month, year] = parts.map(Number)
  if (!day || !month || !year) return null
  return new Date(year, month - 1, day)
}

const daysBetween = (from: Date, to: Date): number =>
  Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))

const gracePeriodDays = (periodicidad: string): number =>
  periodicidad.trim().toUpperCase() === 'SEMANAL' ? 7 : 15

export const computeDaysPastDue = (creditHistory: CreditEntry[]): number => {
  const moraDays: number[] = []

  for (const credit of creditHistory) {
    const grace = gracePeriodDays(credit.periodicidad)
    const seen = new Set<string>()
    for (const payment of credit.payments) {
      if (seen.has(payment.concept)) continue
      seen.add(payment.concept)
      const due = parseDate(payment.dueDate)
      const paid = parseDate(payment.operationDate)
      if (!due || !paid) continue
      const diff = daysBetween(due, paid)
      if (diff > grace) moraDays.push(diff)
    }
  }

  if (moraDays.length === 0) return 0
  return moraDays.reduce((sum, d) => sum + d, 0) / moraDays.length
}
