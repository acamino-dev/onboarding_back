const CONSULTA_FINANCIERA_PATH = '/Migrado/su_conFinanciera.aspx'

export const buildConsultaUrl = (loginUrl: string): string => {
  const parsed = new URL(loginUrl)
  const segments = parsed.pathname.split('/').filter(Boolean)
  const appSegment = segments[0] ?? ''
  return `${parsed.origin}/${appSegment}${CONSULTA_FINANCIERA_PATH}`
}
