import { AnalyzeDocumentCommand, TextractClient, type Block, type Relationship } from '@aws-sdk/client-textract'
import { analyzeDocument } from '../../services/analyzeDocument'

const BUCKET = 'acamino-file-system-dev'
const KEY = 'onboarding/2026/06/28/1b187669-a0a0-4f2a-9fff-cf64530ac093/INE_FRONT.jpg'

const pad = (s: string, n: number): string => s.slice(0, n).padEnd(n)

const printTable = (headers: string[], rows: string[][]): void => {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length))
  )
  const divider = `+${widths.map((w) => '-'.repeat(w + 2)).join('+')}+`
  const fmt = (cells: string[]): string =>
    `|${cells.map((c, i) => ` ${pad(c ?? '', widths[i])} `).join('|')}|`
  const lines = [divider, fmt(headers), divider, ...rows.map(fmt), divider]
  console.log(lines.join('\n'))
}

describe('analyzeDocument integration', () => {
  it('prints Textract blocks and service validation as tables', async () => {
    const client = new TextractClient({})
    const response = await client.send(
      new AnalyzeDocumentCommand({
        Document: { S3Object: { Bucket: BUCKET, Name: KEY } },
        FeatureTypes: ['FORMS'],
      })
    )

    const blocks = response.Blocks ?? []
    const blockMap = new Map<string, Block>(blocks.map((b) => [b.Id ?? '', b]))

    const getChildText = (block: Block): string =>
      (block.Relationships as Relationship[] | undefined)
        ?.filter((r) => r.Type === 'CHILD')
        .flatMap((r) => r.Ids ?? [])
        .map((id) => blockMap.get(id))
        .filter((b): b is Block => b?.BlockType === 'WORD')
        .map((b) => b.Text ?? '')
        .join(' ') ?? ''

    // ── Tabla 1: LINE blocks ──────────────────────────────────────────────
    console.log('\nLINE BLOCKS')
    const lineRows = blocks
      .filter((b) => b.BlockType === 'LINE')
      .map((b) => {
        const words = (b.Relationships as Relationship[] | undefined)
          ?.filter((r) => r.Type === 'CHILD')
          .flatMap((r) => r.Ids ?? [])
          .map((id) => blockMap.get(id))
          .filter((w): w is Block => w?.BlockType === 'WORD')
          .map((w) => `${w.Text}(${w.Confidence?.toFixed(0)}%)`)
          .join('  ') ?? ''
        return [b.Text ?? '', `${b.Confidence?.toFixed(1)}%`, words]
      })
    printTable(['Texto línea', 'Conf%', 'Palabras (word, confianza)'], lineRows)

    // ── Tabla 2: KV pairs ────────────────────────────────────────────────
    console.log('\nKEY-VALUE PAIRS')
    const kvRows: string[][] = []
    for (const block of blocks) {
      if (block.BlockType !== 'KEY_VALUE_SET' || !block.EntityTypes?.includes('KEY')) continue
      const keyText = getChildText(block).toUpperCase().trim()
      const valueBlockId = (block.Relationships as Relationship[])?.find(
        (r) => r.Type === 'VALUE'
      )?.Ids?.[0]
      const valueBlock = valueBlockId ? blockMap.get(valueBlockId) : undefined
      const valueText = valueBlock ? getChildText(valueBlock).trim() : ''
      const keyConf = block.Confidence?.toFixed(1) ?? '-'
      const valConf = valueBlock?.Confidence?.toFixed(1) ?? '-'
      kvRows.push([keyText, `${keyConf}%`, valueText, `${valConf}%`])
    }
    printTable(['KEY', 'Conf%', 'VALUE', 'Conf%'], kvRows)

    // ── Tabla 3: validación del servicio ─────────────────────────────────
    console.log('\nVALIDACIÓN DEL SERVICIO')
    let result: Awaited<ReturnType<typeof analyzeDocument>> | undefined
    let serviceError = ''
    try {
      result = await analyzeDocument(BUCKET, KEY)
    } catch (e) {
      serviceError = e instanceof Error ? e.message : String(e)
    }

    const validationRows = [
      ['nombre', 'NOMBRE / NOMBRES', result?.nombre ?? `ERROR: ${serviceError}`],
      ['curp', 'CURP', result?.curp ?? `ERROR: ${serviceError}`],
      ['fechaNacimiento', 'FECHA DE NACIMIENTO / FECHA NAC / NACIMIENTO', result?.fechaNacimiento ?? `ERROR: ${serviceError}`],
      ['domicilio', 'DOMICILIO / DIRECCION / DIRECCIÓN', result?.domicilio ?? `ERROR: ${serviceError}`],
    ]
    printTable(['Campo', 'Candidatos buscados', 'Valor extraído'], validationRows)

    expect(result).toBeDefined()
    expect(result?.nombre.length).toBeGreaterThan(0)
    expect(result?.curp.length).toBeGreaterThan(0)
    expect(result?.fechaNacimiento.length).toBeGreaterThan(0)
    expect(result?.domicilio.length).toBeGreaterThan(0)
  }, 60000)
})
