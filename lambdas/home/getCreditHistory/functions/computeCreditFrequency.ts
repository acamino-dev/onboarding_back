import type { ParsedCreditRow } from './parseCreditTable'

const ELIGIBLE_STATUSES = new Set(['ACTIVO', 'TERMINADO'])

const parseDate = (dateStr: string): Date | null => {
  const parts = dateStr.split('/')
  if (parts.length !== 3) return null
  const [day, month, year] = parts.map(Number)
  if (!day || !month || !year) return null
  return new Date(year, month - 1, day)
}

const monthsBetween = (from: Date, to: Date): number =>
  (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())

export const computeCreditFrequency = (rows: ParsedCreditRow[]): number => {
  const eligible = rows
    .filter((r) => ELIGIBLE_STATUSES.has(r.status))
    .map((r) => ({
      primerPago: parseDate(r.fechaPrimerPago),
      ultimoPago: parseDate(r.fechaUltimoPago),
    }))
    .filter((r): r is { primerPago: Date; ultimoPago: Date } =>
      r.primerPago !== null && r.ultimoPago !== null
    )
    .sort((a, b) => a.primerPago.getTime() - b.primerPago.getTime())

  if (eligible.length < 2) return 0

  let maxGap = 0
  for (let i = 1; i < eligible.length; i++) {
    const gap = monthsBetween(eligible[i - 1].ultimoPago, eligible[i].primerPago)
    if (gap > maxGap) maxGap = gap
  }

  return maxGap
}
