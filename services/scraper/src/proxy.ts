import type { Page } from "puppeteer"

export type ProxyConfig = {
  password: string | null
  serverUrl: string
  username: string | null
}

type ProxySessionContext = {
  attempt: number
  cityKey: string
  source: string
}

const ROTATING_PROXY_CITY_SEGMENTS = [
  "_country-US_city-south.san.francisco",
  "_country-US_city-san.francisco",
  "_country-US_city-santa.clara",
  "_country-US_city-oakland",
  "_country-US_city-berkeley",
  "_country-US_city-san.leandro",
  "_country-US_city-richmond",
  "_country-US_city-redwood.city",
  "_country-US_city-daly.city",
  "_country-US_city-fairfield",
  "_country-US_city-walnut.creek",
  "_country-US_city-fremont",
  "_country-US_city-mountain.view",
] as const

const CITY_SEGMENT_REGEX = /_country-[A-Za-z]{2}_city-[^_]+/i

const normalizeString = (value: string | undefined): string => {
  return value?.trim() ?? ""
}

const getRandomProxyCitySegment = (): (typeof ROTATING_PROXY_CITY_SEGMENTS)[number] => {
  const randomIndex = Math.floor(Math.random() * ROTATING_PROXY_CITY_SEGMENTS.length)
  return ROTATING_PROXY_CITY_SEGMENTS[randomIndex]
}

const withRandomCitySegment = (value: string): string => {
  const citySegment = getRandomProxyCitySegment()

  if (CITY_SEGMENT_REGEX.test(value)) {
    return value.replace(CITY_SEGMENT_REGEX, citySegment)
  }

  return `${value}${citySegment}`
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

export const getProxyConfigForAttempt = (
  rawValue: string | undefined,
  _context: ProxySessionContext,
): ProxyConfig | null => {
  const normalizedRawValue = normalizeString(rawValue)
  if (!normalizedRawValue) {
    return null
  }

  const rawValueWithCity = withRandomCitySegment(normalizedRawValue)
  const proxyConfig = parseProxyConfig(rawValueWithCity)
  if (!proxyConfig) {
    return null
  }

  return proxyConfig
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
