import {
  StartDocumentAnalysisCommand,
  GetDocumentAnalysisCommand,
  TextractClient,
  type Block,
  type Relationship,
} from '@aws-sdk/client-textract'
import { ValidationError } from '../../../../shared/constants/errors'

const textractClient = new TextractClient({})

const startAndPollAnalysis = async (bucket: string, key: string): Promise<Block[]> => {
  const { JobId } = await textractClient.send(
    new StartDocumentAnalysisCommand({
      DocumentLocation: { S3Object: { Bucket: bucket, Name: key } },
      FeatureTypes: ['FORMS'],
    })
  )

  if (!JobId) throw new Error('Textract did not return a JobId')

  while (true) {
    const status = await textractClient.send(new GetDocumentAnalysisCommand({ JobId }))
    if (status.JobStatus === 'FAILED') {
      throw new Error(`Textract job failed: ${status.StatusMessage ?? 'unknown'}`)
    }
    if (status.JobStatus === 'SUCCEEDED') break
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  const allBlocks: Block[] = []
  let nextToken: string | undefined
  do {
    const page = await textractClient.send(
      new GetDocumentAnalysisCommand({ JobId, NextToken: nextToken })
    )
    allBlocks.push(...(page.Blocks ?? []))
    nextToken = page.NextToken
  } while (nextToken)

  return allBlocks
}

const getTextForBlock = (block: Block, blockMap: Map<string, Block>): string => {
  if (!block.Relationships) return ''
  return (block.Relationships as Relationship[])
    .filter((r: Relationship) => r.Type === 'CHILD')
    .flatMap((r: Relationship) => r.Ids ?? [])
    .map((id: string) => blockMap.get(id))
    .filter((b): b is Block => b?.BlockType === 'WORD')
    .map((b: Block) => b.Text ?? '')
    .join(' ')
}

const WATER_BILL_PATTERN =
  /\b(AGUA POTABLE|AGUA Y DRENAJE|AGUA Y SANEAMIENTO|SERVICIO DE AGUA|SISTEMA DE AGUA|SACMEX|SIAPA|OOAPAS|JAPAC|JUMAPA|CMAS|SAPAL|AGUAKAN|SIMAS|CAEM)\b/
const ELECTRICITY_BILL_PATTERN =
  /\bCFE\b|\b(KWH|COMISION FEDERAL DE ELECTRICIDAD|COMISIÓN FEDERAL DE ELECTRICIDAD|ENERGIA ELECTRICA|ENERGÍA ELÉCTRICA)\b/
const BANK_STATEMENT_PATTERN =
  /\b(ESTADO DE CUENTA|SALDO INICIAL|SALDO FINAL|NUMERO DE CUENTA|NÚMERO DE CUENTA)\b/

const isValidDocumentType = (text: string): boolean =>
  WATER_BILL_PATTERN.test(text) ||
  ELECTRICITY_BILL_PATTERN.test(text) ||
  BANK_STATEMENT_PATTERN.test(text)

const MONTH_MAP: Record<string, number> = {
  ENERO: 0, FEBRERO: 1, MARZO: 2, ABRIL: 3, MAYO: 4, JUNIO: 5,
  JULIO: 6, AGOSTO: 7, SEPTIEMBRE: 8, OCTUBRE: 9, NOVIEMBRE: 10, DICIEMBRE: 11,
}

const FULL_DATE_PATTERN =
  /\b(\d{1,2})\s+DE\s+(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s+(?:DE\s+)?(\d{4})\b/
const MONTH_YEAR_PATTERN =
  /\b(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s+(?:DE\s+)?(\d{4})\b/
const NUMERIC_DATE_PATTERN = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/

const extractDocumentDate = (text: string): Date | undefined => {
  const fullMatch = FULL_DATE_PATTERN.exec(text)
  if (fullMatch) {
    return new Date(parseInt(fullMatch[3], 10), MONTH_MAP[fullMatch[2]], parseInt(fullMatch[1], 10))
  }

  const monthYearMatch = MONTH_YEAR_PATTERN.exec(text)
  if (monthYearMatch) {
    const year = parseInt(monthYearMatch[2], 10)
    const month = MONTH_MAP[monthYearMatch[1]]
    return new Date(year, month + 1, 0) // last day of month — lenient
  }

  const numericMatch = NUMERIC_DATE_PATTERN.exec(text)
  if (numericMatch) {
    const day = parseInt(numericMatch[1], 10)
    const month = parseInt(numericMatch[2], 10) - 1
    const year = parseInt(numericMatch[3], 10)
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31 && year >= 2000) {
      return new Date(year, month, day)
    }
  }

  return undefined
}

const isDocumentRecent = (date: Date): boolean => {
  const now = new Date()
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
  return date >= threeMonthsAgo
}

const CP_PATTERN = /\b\d{5}\b/
const STREET_PATTERN = /\b(CALLE|AV\.?|AVENIDA|BLVD\.?|BOULEVARD|PRIV\.?|PRIVADA|CALZ\.?|CALZADA|CARR\.?|CARRETERA|AND\.?|ANDADOR)\b/
const COLONY_PATTERN = /\b(COL\.?|COLONIA|FRACC\.?|FRACCIONAMIENTO|UNIDAD|RESIDENCIAL|BARRIO|SECC\.?)\b/

const PRICE_LINE = /^\$/
const DATE_LINE =
  /\b(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\b/
const PHONE_LINE = /\(\d{2}\)\s*\d{2}|\b\d{2}\s+\d{2}\s+\d{2}\s+\d{2}/
const PURE_NUMBER_LINE = /^[\d\s]+$/
const KNOWN_LABEL_LINE = /^(TELÉFONO|TELEFONO)$/

const isNoiseLine = (line: string): boolean =>
  PRICE_LINE.test(line) ||
  DATE_LINE.test(line) ||
  PHONE_LINE.test(line) ||
  PURE_NUMBER_LINE.test(line) ||
  KNOWN_LABEL_LINE.test(line)

const extractAddressByPostalCode = (lines: string[]): string | undefined => {
  const cpIdx = lines.findIndex((l) => CP_PATTERN.test(l))
  if (cpIdx === -1) return undefined
  const start = Math.max(0, cpIdx - 11)
  const filtered = lines.slice(start, cpIdx + 1).filter((l) => !isNoiseLine(l))
  if (filtered.length === 0) return undefined
  return filtered.join(' ').trim()
}

const extractAddressByComponents = (lines: string[]): string | undefined => {
  const streetIdx = lines.findIndex((l) => STREET_PATTERN.test(l))
  if (streetIdx !== -1) {
    return lines.slice(streetIdx, streetIdx + 3).join(' ').trim()
  }
  const colonyIdx = lines.findIndex((l) => COLONY_PATTERN.test(l))
  if (colonyIdx !== -1) {
    const start = Math.max(0, colonyIdx - 1)
    return lines.slice(start, colonyIdx + 2).join(' ').trim()
  }
  return undefined
}

const KV_KEY_CANDIDATES = [
  'DOMICILIO DEL SERVICIO',
  'DOMICILIO DE SERVICIO',
  'DIRECCIÓN DEL SERVICIO',
  'DIRECCIÓN DE SERVICIO',
  'DIRECCION DEL SERVICIO',
  'DIRECCION DE SERVICIO',
  'DIRECCIÓN DE INSTALACIÓN',
  'DIRECCION DE INSTALACION',
  'DOMICILIO',
  'DIRECCIÓN',
  'DIRECCION',
]

const extractAddressFromKv = (kvPairs: Record<string, string>): string | undefined => {
  for (const candidate of KV_KEY_CANDIDATES) {
    const entry = Object.entries(kvPairs).find(([k]) => k.includes(candidate))
    if (entry?.[1]?.trim()) return entry[1].trim()
  }
  return undefined
}

export const analyzeAddressDocument = async (bucket: string, key: string): Promise<string> => {
  try {
    const blocks = await startAndPollAnalysis(bucket, key)
    const blockMap = new Map<string, Block>(blocks.map((b: Block) => [b.Id ?? '', b]))
    const kvPairs: Record<string, string> = {}

    for (const block of blocks) {
      if (block.BlockType !== 'KEY_VALUE_SET' || !block.EntityTypes?.includes('KEY')) continue

      const keyText = getTextForBlock(block, blockMap).toUpperCase().trim()
      const valueBlockId = (block.Relationships as Relationship[] | undefined)?.find(
        (r: Relationship) => r.Type === 'VALUE'
      )?.Ids?.[0]
      if (!valueBlockId) continue

      const valueBlock = blockMap.get(valueBlockId)
      if (!valueBlock) continue

      kvPairs[keyText] = getTextForBlock(valueBlock, blockMap).trim()
    }

    const lineTexts = blocks
      .filter((b: Block) => b.BlockType === 'LINE')
      .map((b: Block) => b.Text?.toUpperCase().trim() ?? '')
      .filter((t) => t.length > 0)

    const fullText = lineTexts.join(' ')

    if (!isValidDocumentType(fullText)) {
      throw new ValidationError(
        'Invalid document type: must be a water bill, electricity bill, or bank statement'
      )
    }

    const documentDate = extractDocumentDate(fullText)
    if (!documentDate) {
      throw new ValidationError('Document date not found')
    }
    if (!isDocumentRecent(documentDate)) {
      throw new ValidationError('Document is older than 3 months')
    }

    const address =
      extractAddressByPostalCode(lineTexts) ??
      extractAddressByComponents(lineTexts) ??
      extractAddressFromKv(kvPairs)

    if (!address) {
      throw new ValidationError('Address not found in document')
    }

    return address
  } catch (error) {
    if (error instanceof ValidationError) throw error
    throw new Error(
      `Error on analyzeAddressDocument: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
