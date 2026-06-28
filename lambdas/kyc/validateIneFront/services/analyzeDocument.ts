import { AnalyzeDocumentCommand, TextractClient, type Block, type Relationship } from '@aws-sdk/client-textract'
import { ValidationError } from '../../../../shared/constants/errors'
import type { IneData } from '../types/IneData'

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

const findField = (kvPairs: Record<string, string>, candidates: string[]): string | undefined => {
  for (const candidate of candidates) {
    const entry = Object.entries(kvPairs).find(([k]) => k.includes(candidate))
    if (entry) return entry[1]
  }
  return undefined
}

// Lines that mark end of the name section — stop collecting when hit
const NOMBRE_STOP_PATTERNS = [
  /^DOMICILIO/,
  /^DIRECCI[OÓ]N/,
  /^CURP/,
  /^FECHA/,
  /^CLAVE DE ELECTOR/,
  /^CREDENCIAL/,
  /^INSTITUTO/,
  /^UNIDOS MEXICANOS/,
]

// Lines interspersed near NOMBRE that are not name parts — skip but keep looking
const NOMBRE_SKIP_PATTERNS = [
  /^SEXO/,
  /^VIGENCIA/,
  /^SECCI[OÓ]N/,
  /^A[NÑ]O DE REGISTRO/,
  /^MEXICO/,
]

const extractNameFromLines = (blocks: Block[]): string | undefined => {
  const lines = blocks
    .filter((b: Block) => b.BlockType === 'LINE')
    .map((b: Block) => b.Text?.toUpperCase().trim() ?? '')
    .filter((t) => t.length > 0)

  const nombreIdx = lines.findIndex((t) => t === 'NOMBRE' || t === 'NOMBRES')
  if (nombreIdx === -1) return undefined

  const nameParts: string[] = []
  for (let i = nombreIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    if (NOMBRE_STOP_PATTERNS.some((p) => p.test(line))) break
    if (NOMBRE_SKIP_PATTERNS.some((p) => p.test(line))) continue
    // only pure alphabetic lines (letters, spaces, accented chars) — excludes "SEXO H", numbers, etc.
    if (/^[A-ZÁÉÍÓÚÜÑ\s]{3,}$/.test(line)) nameParts.push(line)
  }

  return nameParts.length > 0 ? nameParts.join(' ') : undefined
}

export const analyzeDocument = async (bucket: string, key: string): Promise<IneData> => {
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

    const nombre = findField(kvPairs, ['NOMBRE', 'NOMBRES']) ?? extractNameFromLines(blocks)
    const curp = findField(kvPairs, ['CURP'])
    const fechaNacimiento = findField(kvPairs, ['FECHA DE NACIMIENTO', 'FECHA NAC', 'NACIMIENTO'])
    const domicilio = findField(kvPairs, ['DOMICILIO', 'DIRECCION', 'DIRECCIÓN'])
    const vigencia = findField(kvPairs, ['VIGENCIA'])

    const missingFields = [
      !nombre && 'nombre',
      !curp && 'curp',
      !fechaNacimiento && 'fechaNacimiento',
      !domicilio && 'domicilio',
      !vigencia && 'vigencia',
    ].filter(Boolean)

    if (missingFields.length > 0) {
      throw new ValidationError(`Missing required INE fields: ${missingFields.join(', ')}`)
    }

    const years = vigencia!.match(/\d{4}/g)?.map(Number) ?? []
    const expirationYear = Math.max(...years)
    const currentYear = new Date().getFullYear()
    if (expirationYear < currentYear) {
      throw new ValidationError(`INE expired: vigencia ${vigencia}`)
    }

    return { nombre: nombre!, curp: curp!, fechaNacimiento: fechaNacimiento!, domicilio: domicilio! }
  } catch (error) {
    if (error instanceof ValidationError) throw error
    throw new Error(
      `Error on analyzeDocument: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
