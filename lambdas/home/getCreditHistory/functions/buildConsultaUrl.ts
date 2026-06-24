const CONSULTA_FINANCIERA_PATH = '/Migrado/su_conFinanciera.aspx'
const CAT_PERSONA_PATH = '/Migrado/su_catPersona.aspx'

const buildPortalUrl = (loginUrl: string, path: string): string => {
  const parsed = new URL(loginUrl)
  const appSegment = parsed.pathname.split('/').filter(Boolean)[0] ?? ''
  return `${parsed.origin}/${appSegment}${path}`
}

export const buildConsultaUrl = (loginUrl: string): string =>
  buildPortalUrl(loginUrl, CONSULTA_FINANCIERA_PATH)

export const buildCatPersonaUrl = (loginUrl: string): string =>
  buildPortalUrl(loginUrl, CAT_PERSONA_PATH)
