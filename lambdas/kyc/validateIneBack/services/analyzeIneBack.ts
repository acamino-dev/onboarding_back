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

// Lines on the INE back that signal end of the name section
const BACK_NAME_STOP_PATTERNS = [
  /^DOMICILIO/,
  /^DIRECCI[OÓ]N/,
  /^MUNICIPIO/,
  /^DELEGACI[OÓ]N/,
  /^ENTIDAD/,
  /^SECCI[OÓ]N/,
  /^CLAVE DE ELECTOR/,
  /^FOLIO/,
  /^CURP/,
  /^VIGENCIA/,
  /^FECHA/,
]

// Lines interspersed near the name that are not name parts
const BACK_NAME_SKIP_PATTERNS = [
  /^ESTADOS UNIDOS/,
  /^INSTITUTO/,
  /^ELECTORAL/,
  /^MEXICO/,
  /^NOMBRE/,
  /^SEXO/,
  /^A[NÑ]O/,
]

const extractNameFromLines = (blocks: Block[]): string | undefined => {
  const lines = blocks
    .filter((b: Block) => b.BlockType === 'LINE')
    .map((b: Block) => b.Text?.toUpperCase().trim() ?? '')
    .filter((t) => t.length > 0)

  // Try to find explicit NOMBRE/NOMBRES label first
  const nombreIdx = lines.findIndex((t) => t === 'NOMBRE' || t === 'NOMBRES')
  const startIdx = nombreIdx !== -1 ? nombreIdx + 1 : 0

  const nameParts: string[] = []
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i]
    if (BACK_NAME_STOP_PATTERNS.some((p) => p.test(line))) break
    if (BACK_NAME_SKIP_PATTERNS.some((p) => p.test(line))) continue
    if (/^[A-ZÁÉÍÓÚÜÑ\s]{3,}$/.test(line)) nameParts.push(line)
    // If we found name parts and hit a non-alpha line, stop collecting
    if (nameParts.length > 0 && !/^[A-ZÁÉÍÓÚÜÑ\s]{3,}$/.test(line)) break
  }

  return nameParts.length > 0 ? nameParts.join(' ') : undefined
}

export const analyzeIneBack = async (bucket: string, key: string): Promise<string> => {
  try {
    const response = await textractClient.send(
      new AnalyzeDocumentCommand({
        Document: { S3Object: { Bucket: bucket, Name: key } },
        FeatureTypes: ['FORMS'],
      })
    )

    const blocks = response.Blocks ?? []
    const blockMap = new Map<string, Block>(blocks.map((b: Block) => [b.Id ?? '', b]))

    // Try KV pairs first
    for (const block of blocks) {
      if (block.BlockType !== 'KEY_VALUE_SET' || !block.EntityTypes?.includes('KEY')) continue
      const keyText = getTextForBlock(block, blockMap).toUpperCase().trim()
      if (!keyText.includes('NOMBRE')) continue
      const valueBlockId = (block.Relationships as Relationship[] | undefined)?.find(
        (r: Relationship) => r.Type === 'VALUE'
      )?.Ids?.[0]
      if (!valueBlockId) continue
      const valueBlock = blockMap.get(valueBlockId)
      if (!valueBlock) continue
      const nombre = getTextForBlock(valueBlock, blockMap).trim()
      if (nombre) return nombre
    }

    // Fall back to LINE-based extraction
    const nombre = extractNameFromLines(blocks)
    if (!nombre) {
      throw new ValidationError('Name not found in INE back document')
    }

    return nombre
  } catch (error) {
    if (error instanceof ValidationError) throw error
    throw new Error(
      `Error on analyzeIneBack: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
