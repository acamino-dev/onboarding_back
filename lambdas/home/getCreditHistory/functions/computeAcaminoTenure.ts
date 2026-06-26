import type { ParsedCreditRow } from '../functions/parseCreditTable'

export const computeAcaminoTenure = (rows: ParsedCreditRow[]): number | null => {
  const eligible = rows.filter((r) => r.status === 'ACTIVO' || r.status === 'TERMINADO')
  if (eligible.length === 0) return null

  const dates = eligible.map((r) => {
    const [day, month, year] = r.fechaPrimerPago.split('/').map(Number)
    return new Date(year, month - 1, day)
  })

  const oldest = new Date(Math.min(...dates.map((d) => d.getTime())))
  const now = new Date()
  return (now.getFullYear() - oldest.getFullYear()) * 12 + (now.getMonth() - oldest.getMonth())
}
