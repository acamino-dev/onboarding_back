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

const CP_PATTERN = /\b\d{5}\b/
const STREET_PATTERN = /\b(CALLE|AV\.?|AVENIDA|BLVD\.?|BOULEVARD|PRIV\.?|PRIVADA|CALZ\.?|CALZADA|CARR\.?|CARRETERA|AND\.?|ANDADOR)\b/
const COLONY_PATTERN = /\b(COL\.?|COLONIA|FRACC\.?|FRACCIONAMIENTO|UNIDAD|RESIDENCIAL|BARRIO|SECC\.?)\b/

const extractAddressByPostalCode = (lines: string[]): string | undefined => {
  const cpIdx = lines.findIndex((l) => CP_PATTERN.test(l))
  if (cpIdx === -1) return undefined
  const start = Math.max(0, cpIdx - 3)
  return lines.slice(start, cpIdx + 1).join(' ').trim()
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
