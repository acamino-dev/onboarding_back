import { AnalyzeDocumentCommand, TextractClient, type Block, type Relationship } from '@aws-sdk/client-textract'
import { analyzeIneBack } from '../../services/analyzeIneBack'

const BUCKET = 'acamino-file-system-dev'
const KEY = 'onboarding/2026/06/28/1b187669-a0a0-4f2a-9fff-cf64530ac093/INE_BACK.jpg'

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

describe('analyzeIneBack integration', () => {
  it('prints Textract LINE blocks and service extraction result', async () => {
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
    const lineBlocks = blocks.filter((b) => b.BlockType === 'LINE')
    const lineRows = lineBlocks.map((b) => {
      const words =
        (b.Relationships as Relationship[] | undefined)
          ?.filter((r) => r.Type === 'CHILD')
          .flatMap((r) => r.Ids ?? [])
          .map((id) => blockMap.get(id))
          .filter((w): w is Block => w?.BlockType === 'WORD')
          .map((w) => `${w.Text}(${w.Confidence?.toFixed(0)}%)`)
          .join('  ') ?? ''
      return [b.Text ?? '', `${b.Confidence?.toFixed(1)}%`, words]
    })
    printTable(['Texto línea', 'Conf%', 'Palabras (word, confianza)'], lineRows)

    // ── IDMEX marker ─────────────────────────────────────────────────────
    const idmexBlock = lineBlocks.find((b) =>
      /^IDMEX/.test(b.Text?.toUpperCase().trim() ?? '')
    )
    console.log('\nIDMEX MARKER')
    printTable(
      ['Check', 'Texto detectado', 'Conf%'],
      [
        [
          idmexBlock ? 'FOUND ✓' : 'NOT FOUND ✗',
          idmexBlock?.Text ?? '-',
          idmexBlock ? `${idmexBlock.Confidence?.toFixed(1)}%` : '-',
        ],
      ]
    )

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

    // ── Tabla 3: extracción del servicio ─────────────────────────────────
    console.log('\nEXTRACCIÓN DEL SERVICIO')
    let nombre: string | undefined
    let serviceError = ''
    try {
      nombre = await analyzeIneBack(BUCKET, KEY)
    } catch (e) {
      serviceError = e instanceof Error ? e.message : String(e)
    }

    const validationRows = [
      ['nombre', 'MRZ línea de nombre (APELLIDOS NOMBRES)', nombre ?? `ERROR: ${serviceError}`],
    ]
    printTable(['Campo', 'Fuente', 'Valor extraído'], validationRows)

    expect(idmexBlock).toBeDefined()
    expect(nombre).toBeDefined()
    expect((nombre ?? '').length).toBeGreaterThan(0)
  }, 60000)
})
