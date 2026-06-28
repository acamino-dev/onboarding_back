import { AnalyzeDocumentCommand, TextractClient, type Block, type Relationship } from '@aws-sdk/client-textract'
import { ValidationError } from '../../../../shared/constants/errors'

const textractClient = new TextractClient({})

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

const ADDRESS_KEY_CANDIDATES = [
  'DOMICILIO DEL SERVICIO',
  'DOMICILIO DE SERVICIO',
  'DIRECCIÓN DEL SERVICIO',
  'DIRECCIÓN DE SERVICIO',
  'DIRECCION DEL SERVICIO',
  'DIRECCION DE SERVICIO',
  'DOMICILIO',
  'DIRECCIÓN',
  'DIRECCION',
]

const extractAddressFromKv = (kvPairs: Record<string, string>): string | undefined => {
  for (const candidate of ADDRESS_KEY_CANDIDATES) {
    const entry = Object.entries(kvPairs).find(([k]) => k.includes(candidate))
    if (entry?.[1]?.trim()) return entry[1].trim()
  }
  return undefined
}

// Addresses often appear after a keyword line — collect next 2 non-keyword lines
const ADDRESS_LINE_KEYWORDS = [
  'DOMICILIO',
  'DIRECCIÓN',
  'DIRECCION',
]

const extractAddressFromLines = (blocks: Block[]): string | undefined => {
  const lines = blocks
    .filter((b: Block) => b.BlockType === 'LINE')
    .map((b: Block) => b.Text?.toUpperCase().trim() ?? '')
    .filter((t) => t.length > 0)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!ADDRESS_LINE_KEYWORDS.some((kw) => line.startsWith(kw))) continue

    const colonIdx = line.indexOf(':')
    if (colonIdx !== -1 && colonIdx < line.length - 2) {
      const addr = line.slice(colonIdx + 1).trim()
      if (addr.length > 5) return addr
    }

    const nextLines = lines
      .slice(i + 1, i + 3)
      .filter((l) => !ADDRESS_LINE_KEYWORDS.some((kw) => l.startsWith(kw)))
      .join(' ')
      .trim()
    if (nextLines.length > 5) return nextLines
  }

  return undefined
}

export const analyzeAddressDocument = async (bucket: string, key: string): Promise<string> => {
  try {
    const response = await textractClient.send(
      new AnalyzeDocumentCommand({
        Document: { S3Object: { Bucket: bucket, Name: key } },
        FeatureTypes: ['FORMS'],
      })
    )

    const blocks = response.Blocks ?? []
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

    const address =
      extractAddressFromKv(kvPairs) ?? extractAddressFromLines(blocks)

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
