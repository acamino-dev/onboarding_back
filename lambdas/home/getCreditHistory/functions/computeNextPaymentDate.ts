import type { CreditEntry } from '../types/CreditHistoryResult'

const parseDate = (dateStr: string): Date | null => {
  const parts = dateStr.split('/')
  if (parts.length !== 3) return null
  const [day, month, year] = parts.map(Number)
  if (!day || !month || !year) return null
  return new Date(year, month - 1, day)
}

const intervalDays = (periodicidad: string): number =>
  periodicidad.trim().toUpperCase() === 'SEMANAL' ? 7 : 15

const parseConceptNumbers = (concept: string): { num: number } | null => {
  const match = concept.match(/PAGO\s+(\d+)\s+de\s+(\d+)/i)
  if (!match) return null
  const num = Number(match[1])
  return num ? { num } : null
}

const formatDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}/${date.getFullYear()}`
}

export const computeNextPaymentDate = (entry: CreditEntry): string | null => {
  let lastInstallment: { num: number; dueDate: Date } | null = null
  const seen = new Set<string>()

  for (const payment of entry.payments) {
    if (seen.has(payment.concept)) continue
    seen.add(payment.concept)

    const due = parseDate(payment.dueDate)
    if (!due) continue

    const parsed = parseConceptNumbers(payment.concept)
    if (parsed && (!lastInstallment || parsed.num > lastInstallment.num)) {
      lastInstallment = { num: parsed.num, dueDate: due }
    }
  }

  if (!lastInstallment) return null

  const nextDate = new Date(
    lastInstallment.dueDate.getTime() + intervalDays(entry.periodicidad) * 24 * 60 * 60 * 1000
  )
  return formatDate(nextDate)
}
