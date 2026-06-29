import {
  StartDocumentAnalysisCommand,
  GetDocumentAnalysisCommand,
  TextractClient,
  type Block,
  type Relationship,
} from '@aws-sdk/client-textract'
import { ValidationError } from '../../../../shared/constants/errors'
import type { BankData } from '../types/BankData'

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

const findField = (kvPairs: Record<string, string>, candidates: string[]): string | undefined => {
  for (const candidate of candidates) {
    const entry = Object.entries(kvPairs).find(([k]) => k.includes(candidate))
    if (entry) return entry[1]
  }
  return undefined
}

const ACCOUNT_NUMBER_REGEX = /\b\d{10,20}\b/

const extractAccountFromLines = (blocks: Block[]): string | undefined => {
  const lines = blocks
    .filter((b: Block) => b.BlockType === 'LINE')
    .map((b: Block) => b.Text?.trim() ?? '')
    .filter((t) => t.length > 0)

  for (let i = 0; i < lines.length; i++) {
    const upper = lines[i].toUpperCase()
    if (upper.includes('CUENTA') || upper.includes('CLABE') || upper.includes('NO.') || upper.includes('NÚMERO')) {
      const combined = lines.slice(i, i + 3).join(' ')
      const match = ACCOUNT_NUMBER_REGEX.exec(combined)
      if (match) return match[0]
    }
  }

  for (const line of lines) {
    const match = ACCOUNT_NUMBER_REGEX.exec(line)
    if (match) return match[0]
  }

  return undefined
}

const NAME_STOP_PATTERNS = [
  /^DOMICILIO/,
  /^DIRECCI[OÓ]N/,
  /^RFC/,
  /^CUENTA/,
  /^CLABE/,
  /^SUCURSAL/,
  /^FECHA/,
  /^SALDO/,
  /^PERIODO/,
]

const NAME_SKIP_PATTERNS = [
  /^TITULAR/,
  /^NOMBRE DEL CLIENTE/,
  /^NOMBRE:/,
]

const extractNameFromLines = (blocks: Block[]): string | undefined => {
  const lines = blocks
    .filter((b: Block) => b.BlockType === 'LINE')
    .map((b: Block) => b.Text?.toUpperCase().trim() ?? '')
    .filter((t) => t.length > 0)

  const markerIdx = lines.findIndex(
    (t) =>
      t === 'NOMBRE' ||
      t === 'TITULAR' ||
      t === 'NOMBRE DEL CLIENTE' ||
      t.startsWith('NOMBRE:') ||
      t.startsWith('TITULAR:')
  )

  if (markerIdx !== -1) {
    const nameParts: string[] = []
    const markerLine = lines[markerIdx]
    const inline = markerLine.replace(/^(NOMBRE|TITULAR|NOMBRE DEL CLIENTE|NOMBRE:|TITULAR:)\s*/i, '').trim()
    if (inline && /^[A-ZÁÉÍÓÚÜÑ\s]{3,}$/.test(inline)) nameParts.push(inline)

    for (let i = markerIdx + 1; i < lines.length; i++) {
      const line = lines[i]
      if (NAME_STOP_PATTERNS.some((p) => p.test(line))) break
      if (NAME_SKIP_PATTERNS.some((p) => p.test(line))) continue
      if (/^[A-ZÁÉÍÓÚÜÑ\s]{3,}$/.test(line)) nameParts.push(line)
      if (nameParts.length >= 2) break
    }

    if (nameParts.length > 0) return nameParts.join(' ')
  }

  return undefined
}

export const analyzeBankDocument = async (bucket: string, key: string): Promise<BankData> => {
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

    const nombre =
      findField(kvPairs, ['NOMBRE', 'TITULAR', 'NOMBRE DEL CLIENTE']) ??
      extractNameFromLines(blocks)

    const numeroCuenta =
      findField(kvPairs, ['CUENTA', 'CLABE', 'NÚMERO DE CUENTA', 'NUMERO DE CUENTA', 'NO. DE CUENTA']) ??
      extractAccountFromLines(blocks)

    const missingFields = [!nombre && 'nombre', !numeroCuenta && 'numeroCuenta'].filter(Boolean)

    if (missingFields.length > 0) {
      throw new ValidationError(`Missing required bank fields: ${missingFields.join(', ')}`)
    }

    return { nombre: nombre!, numeroCuenta: numeroCuenta! }
  } catch (error) {
    if (error instanceof ValidationError) throw error
    throw new Error(
      `Error on analyzeBankDocument: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
