import type { CreditEntry } from '../types/CreditHistoryResult'

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

const intervalDays = (periodicidad: string): number =>
  periodicidad.trim().toUpperCase() === 'SEMANAL' ? 7 : 15

const addDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000)

const parseConceptNumbers = (concept: string): { num: number; total: number } | null => {
  const match = concept.match(/PAGO\s+(\d+)\s+de\s+(\d+)/i)
  if (!match) return null
  const num = Number(match[1])
  const total = Number(match[2])
  if (!num || !total) return null
  return { num, total }
}

export const computeDaysPastDue = (creditHistory: CreditEntry[]): number => {
  const today = new Date()
  const moraDays: number[] = []

  for (const credit of creditHistory) {
    const grace = gracePeriodDays(credit.periodicidad)
    const seen = new Set<string>()
    let lastInstallment: { num: number; total: number; dueDate: Date } | null = null

    for (const payment of credit.payments) {
      if (seen.has(payment.concept)) continue
      seen.add(payment.concept)

      const due = parseDate(payment.dueDate)
      const paid = parseDate(payment.operationDate)
      if (!due || !paid) continue

      const diff = daysBetween(due, paid)
      if (diff > grace) moraDays.push(diff)

      const parsed = parseConceptNumbers(payment.concept)
      if (parsed && (!lastInstallment || parsed.num > lastInstallment.num)) {
        lastInstallment = { num: parsed.num, total: parsed.total, dueDate: due }
      }
    }

    if (lastInstallment && lastInstallment.num < lastInstallment.total) {
      const nextDue = addDays(lastInstallment.dueDate, intervalDays(credit.periodicidad))
      const daysLate = daysBetween(nextDue, today)
      if (daysLate > grace) moraDays.push(daysLate)
    }
  }

  if (moraDays.length === 0) return 0
  return Math.floor(moraDays.reduce((sum, d) => sum + d, 0) / moraDays.length)
}
