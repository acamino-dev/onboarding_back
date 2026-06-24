import type { Payment } from '../../types/CreditHistoryResult'

export const extractHiddenField = (html: string, id: string): string => {
  const match =
    html.match(new RegExp(`id="${id}"[^>]*value="([^"]*)"`, 'i')) ??
    html.match(new RegExp(`value="([^"]*)"[^>]*id="${id}"`, 'i'))
  return match?.[1] ?? ''
}

export const stripTags = (html: string): string =>
  html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim()

export const getInputValue = (html: string, idSuffix: string): string => {
  const match =
    html.match(new RegExp(`id="[^"]*${idSuffix}"[^>]*value="([^"]*)"`)) ??
    html.match(new RegExp(`value="([^"]*)"[^>]*id="[^"]*${idSuffix}"`))
  return match?.[1] ?? ''
}

export const getCheckedRadioValue = (html: string, nameSuffix: string): string => {
  const match = html.match(new RegExp(`name="[^"]*${nameSuffix}"[^>]*value="([^"]*)"[^>]*checked`))
  return match?.[1] ?? ''
}

const decodeHtmlEntities = (text: string): string =>
  text.replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(parseInt(code, 10)))

export const parseSelectedOption = (html: string, selectId: string): string => {
  const selectMatch = html.match(new RegExp(`id="${selectId}"[^>]*>([\\s\\S]*?)<\\/select>`))
  if (!selectMatch) return ''
  const optionMatch = selectMatch[1].match(/<option[^>]*selected[^>]*>([^<]*)<\/option>/)
  return decodeHtmlEntities(optionMatch?.[1]?.trim() ?? '')
}

export const parsePagosTable = (responseText: string): Payment[] => {
  const tableMatch = responseText.match(
    /<table[^>]*id="[^"]*gvPagosH"[^>]*>([\s\S]*?)<\/table>/
  )
  if (!tableMatch) return []

  const rows = [...tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].slice(1)
  const payments: Payment[] = []

  for (const row of rows) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => stripTags(m[1]))
    if (cells.length < 11) continue
    if (cells[0] === 'Totales') continue

    payments.push({
      operationDate: cells[0],
      valueDate: cells[1],
      amount: cells[2],
      concept: cells[3],
      dueDate: cells[4],
      paymentType: cells[5],
      invoice: cells[6],
      capital: cells[7],
      interest: cells[8],
      iva: cells[9],
      total: cells[10],
    })
  }

  return payments
}
