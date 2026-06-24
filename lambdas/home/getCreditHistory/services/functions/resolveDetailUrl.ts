const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export type ResolveDetailUrlArgs = {
  searchUrl: string
  cookie: string
  viewState: string
  viewStateGenerator: string
  rfc: string
  clientCve: string
  clientNom: string
  eventTarget: string
}

// Replay the gvData row __doPostBack against the search page. The server-side
// click handler issues a Response.Redirect to su_ConsultaFinanciera.aspx with
// the contract's nav params (CveContPro/CvePersona/NomPer/PJuridica/CveEmpresa/
// NomEmpresa). We capture that target instead of following it.
export const resolveDetailUrl = async (args: ResolveDetailUrlArgs): Promise<string> => {
  const body = new URLSearchParams({
    __EVENTTARGET: args.eventTarget,
    __EVENTARGUMENT: '',
    __VIEWSTATE: args.viewState,
    __VIEWSTATEGENERATOR: args.viewStateGenerator,
    'ctl00$ContentPlaceHolder1$txtCve': args.clientCve,
    'ctl00$ContentPlaceHolder1$GpoBusquedaPor': 'rdbRFC',
    'ctl00$ContentPlaceHolder1$txtRFC': args.rfc,
    'ctl00$ContentPlaceHolder1$txtContrato': '',
    'ctl00$ContentPlaceHolder1$txtNom': args.clientNom,
    'ctl00$ContentPlaceHolder1$cmbEmpresa': '0',
    'ctl00$ContentPlaceHolder1$cmbEstatus': '0',
  })

  const response = await fetch(args.searchUrl, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Referer: args.searchUrl,
      'User-Agent': USER_AGENT,
      Cookie: args.cookie,
    },
    body: body.toString(),
  })

  let location = response.headers.get('location')
  if (!location) {
    // Async postback path: redirect arrives as a |pageRedirect||url| delta segment
    const text = await response.text()
    location = text.match(/\|pageRedirect\|\|([^|]*)\|/)?.[1] ?? null
  }
  if (!location) throw new Error('could not resolve contract detail url from postback')

  return new URL(location, args.searchUrl).toString()
}
