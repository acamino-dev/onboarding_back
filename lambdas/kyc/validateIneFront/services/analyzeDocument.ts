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

    const nombre = findField(kvPairs, ['NOMBRE', 'NOMBRES'])
    const curp = findField(kvPairs, ['CURP'])
    const fechaNacimiento = findField(kvPairs, ['FECHA DE NACIMIENTO', 'FECHA NAC', 'NACIMIENTO'])
    const domicilio = findField(kvPairs, ['DOMICILIO', 'DIRECCION', 'DIRECCIÓN'])

    const missingFields = [
      !nombre && 'nombre',
      !curp && 'curp',
      !fechaNacimiento && 'fechaNacimiento',
      !domicilio && 'domicilio',
    ].filter(Boolean)

    if (missingFields.length > 0) {
      throw new ValidationError(`Missing required INE fields: ${missingFields.join(', ')}`)
    }

    return { nombre: nombre!, curp: curp!, fechaNacimiento: fechaNacimiento!, domicilio: domicilio! }
  } catch (error) {
    if (error instanceof ValidationError) throw error
    throw new Error(
      `Error on analyzeDocument: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
