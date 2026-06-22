import { chromium } from 'playwright'
import { AuthError } from '../../../../shared/constants/errors'
import { getSecret } from '../../../../shared/utils/secrets'
import type { CreditHistoryResult } from '../types/CreditHistoryResult'

type PortalSecret = {
  user: string
  password: string
  url: string
}

const CONSULTA_FINANCIERA_PATH = '/Migrado/su_conFinanciera.aspx'

const buildConsultaUrl = (loginUrl: string): string => {
  const parsed = new URL(loginUrl)
  const segments = parsed.pathname.split('/').filter(Boolean)
  const appSegment = segments[0] ?? ''
  return `${parsed.origin}/${appSegment}${CONSULTA_FINANCIERA_PATH}`
}

export const fetchCreditHistory = async (
  rfc: string,
  portalSecretArn: string
): Promise<CreditHistoryResult> => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  page.setDefaultTimeout(60000)

  try {
    const rawSecret = await getSecret(portalSecretArn)
    const { user, password, url } = JSON.parse(rawSecret) as PortalSecret

    await page.goto(url, { waitUntil: 'networkidle' })
    await page.fill('#Login1_UserName', user)
    await page.fill('#Login1_Password', password)
    await page.click('#Login1_ImageButton1')
    await page.waitForLoadState('networkidle')

    const loginError = await page
      .$eval('#Login1_FailureText', (el: Element): string => el.textContent?.trim() ?? '')
      .catch((): string => '')
    if (loginError) throw new AuthError('Portal login failed')

    await page.goto(buildConsultaUrl(url), { waitUntil: 'networkidle' })

    await page.click('#ctl00_ContentPlaceHolder1_rdbRFC')
    await page.fill('#ctl00_ContentPlaceHolder1_txtRFC', rfc)
    await page.click('#ctl00_ContentPlaceHolder1_cmdBuscar')
    await page.waitForLoadState('networkidle')

    const table = await page.$('#ctl00_ContentPlaceHolder1_gvData')
    if (!table) {
      return {
        history: false,
        operator: null,
        activeCredit: null,
        balance: null,
        credit: null,
        creditHistory: null,
      }
    }

    const activeCredit = await page.$eval(
      '#ctl00_ContentPlaceHolder1_gvData',
      (tableEl: Element): boolean => {
        const rows = Array.from(tableEl.querySelectorAll('tbody tr'))
        return rows.some((row: Element): boolean => {
          const cells = row.querySelectorAll('td')
          if (!cells.length) return false
          return cells[cells.length - 1]?.textContent?.trim() === 'ACTIVO'
        })
      }
    )

    return {
      history: true,
      operator: false,
      activeCredit,
      balance: 0,
      credit: '',
      creditHistory: [],
    }
  } catch (error) {
    if (error instanceof AuthError) throw error
    throw new Error(
      `Error on fetchCreditHistory: ${error instanceof Error ? error.message : String(error)}`
    )
  } finally {
    await browser.close()
  }
}
