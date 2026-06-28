import { AnalyzeDocumentCommand, TextractClient, type Block, type Relationship } from '@aws-sdk/client-textract'
import { analyzeIneBack } from '../../services/analyzeIneBack'

const BUCKET = 'acamino-file-system-dev'
const KEY = 'onboarding/2026/06/27/251e6e00-f6ba-4bb7-a427-70ab1f82320a/INE_BACK.jpg'

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

    console.log('\nEXTRACCIÓN DEL SERVICIO')
    let nombre: string | undefined
    let serviceError = ''
    try {
      nombre = await analyzeIneBack(BUCKET, KEY)
    } catch (e) {
      serviceError = e instanceof Error ? e.message : String(e)
    }

    const validationRows = [
      ['nombre', nombre ?? `ERROR: ${serviceError}`],
    ]
    printTable(['Campo', 'Valor extraído'], validationRows)

    expect(nombre).toBeDefined()
    expect((nombre ?? '').length).toBeGreaterThan(0)
  }, 60000)
})
