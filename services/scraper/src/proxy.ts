import type { Page } from "puppeteer"

export type ProxyConfig = {
  password: string | null
  serverUrl: string
  username: string | null
}

const normalizeString = (value: string | undefined): string => {
  return value?.trim() ?? ""
}

export const parseProxyConfig = (rawValue: string | undefined): ProxyConfig | null => {
  const value = normalizeString(rawValue)

  if (!value) {
    return null
  }

  const evomiMatch = value.match(/^(https?):\/\/([^:/]+):(\d+):([^:]+):(.+)$/i)

  if (!evomiMatch) {
    throw new Error(
      "SCRAPER_PROXY_SERVER must use the Evomi format: http://host:port:username:password",
    )
  }

  const [, protocol, host, port, username, password] = evomiMatch

  return {
    serverUrl: `${protocol}://${host}:${port}`,
    username,
    password,
  }
}

export const applyProxyAuthentication = async (
  page: Page,
  proxyConfig: ProxyConfig | null,
): Promise<void> => {
  if (!proxyConfig?.username || !proxyConfig.password) {
    return
  }

  await page.authenticate({
    username: proxyConfig.username,
    password: proxyConfig.password,
  })
}
