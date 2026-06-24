import { stripTags } from './parseHtml'
import { extractHiddenField } from './parseHtml'

export type ParsedCreditRow = {
  creditId: string
  status: string
  balance: number
  eventTarget: string
}

const extractSpanText = (html: string, idSuffix: string): string => {
  const match = html.match(new RegExp(`id="[^"]*${idSuffix}"[^>]*>([^<]*)<\\/span>`))
  return match?.[1]?.trim() ?? ''
}

const parseBalance = (text: string): number => parseFloat(text.replace(/,/g, '')) || 0

// __VIEWSTATE / __VIEWSTATEGENERATOR arrive inside the async-postback delta as
// |<len>|hiddenField|<name>|<value>|. Fall back to a plain hidden input in case
// the search ever returns a full page.
export const extractDeltaField = (responseText: string, name: string): string => {
  const match = responseText.match(new RegExp(`\\|hiddenField\\|${name}\\|([^|]*)\\|`))
  return match?.[1] ?? extractHiddenField(responseText, name)
}

export const parseCreditTable = (responseText: string): ParsedCreditRow[] => {
  const tableMatch = responseText.match(
    /<table[^>]*id="ctl00_ContentPlaceHolder1_gvData"[^>]*>([\s\S]*?)<\/table>/
  )
  if (!tableMatch) return []

  const rows = [...tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].slice(1)
  const parsed: ParsedCreditRow[] = []

  for (const row of rows) {
    const rowHtml = row[1]
    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => stripTags(m[1]))
    if (cells.length < 9) continue

    parsed.push({
      creditId: cells[0],
      status: cells[8],
      balance: parseBalance(extractSpanText(rowHtml, 'lblMonto2')),
      // The link's __doPostBack arg; quotes arrive HTML-encoded (&#39;) in the
      // async-postback delta, plain (') in a full page.
      eventTarget:
        rowHtml.match(/__doPostBack\((?:&#39;|')([^&']*lnkRegistro)(?:&#39;|')/)?.[1] ?? '',
    })
  }

  return parsed
}
