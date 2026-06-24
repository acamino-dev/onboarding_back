import type { Payment, CreditEntry } from '../types/CreditHistoryResult'
import { resolveDetailUrl } from './functions/resolveDetailUrl'
import { loadDetailDefaults } from './functions/loadDetailDefaults'
import { parsePagosTable } from './functions/parseHtml'

type CreditRow = {
  creditId: string
  status: string
  eventTarget: string
}

export type ContractContext = {
  searchUrl: string
  cookie: string
  viewState: string
  viewStateGenerator: string
  rfc: string
  clientCve: string
  clientNom: string
}

const PAYMENT_STATUSES = new Set(['ACTIVO', 'TERMINADO'])

const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const fetchSingleContractPayments = async (
  args: ContractContext & { eventTarget: string }
): Promise<Payment[]> => {
  try {
    const detailUrl = await resolveDetailUrl(args)
    const { body } = await loadDetailDefaults(detailUrl, args.cookie)

    const response = await fetch(detailUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-MicrosoftAjax': 'Delta=true',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: detailUrl,
        'User-Agent': USER_AGENT,
        Cookie: args.cookie,
      },
      body: body.toString(),
    })

    if (!response.ok) throw new Error(`pagos search failed with status ${response.status}`)

    return parsePagosTable(await response.text())
  } catch (error) {
    throw new Error(
      `Error on fetchContractPayments: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const fetchContractPayments = async (
  rows: CreditRow[],
  context: ContractContext
): Promise<CreditEntry[]> =>
  Promise.all(
    rows
      .filter((row) => PAYMENT_STATUSES.has(row.status))
      .map(async (row): Promise<CreditEntry> => {
        if (!row.eventTarget) return { creditId: row.creditId, payments: [] }
        const payments = await fetchSingleContractPayments({ ...context, eventTarget: row.eventTarget })
        return { creditId: row.creditId, payments }
      })
  )
