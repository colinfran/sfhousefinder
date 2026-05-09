import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

export type CityTarget = {
  key: string
  label: string
  url: string
  requiredLocationKeywords?: string[]
}

export const MIN_PRICE = 3000
export const MAX_PRICE = 4800
export const MIN_BEDS = 2

const parseNumberEnv = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const currentFilePath = fileURLToPath(import.meta.url)
const currentDir = dirname(currentFilePath)

export const ROOT_ENV_PATH = resolve(currentDir, "../../../../.env")

export const NAVIGATION_TIMEOUT_MS = parseNumberEnv(process.env.APARTMENTS_NAV_TIMEOUT_MS, 90000)
export const LISTINGS_WAIT_TIMEOUT_MS = parseNumberEnv(
  process.env.APARTMENTS_LISTINGS_TIMEOUT_MS,
  45000,
)
export const MAX_SCRAPE_ATTEMPTS = parseNumberEnv(process.env.APARTMENTS_MAX_ATTEMPTS, 3)
export const PRE_NAVIGATION_MIN_DELAY_MS = parseNumberEnv(
  process.env.APARTMENTS_PRE_NAV_MIN_DELAY_MS,
  10000,
)
export const PRE_NAVIGATION_MAX_DELAY_MS = parseNumberEnv(
  process.env.APARTMENTS_PRE_NAV_MAX_DELAY_MS,
  30000,
)
export const RETRY_BASE_DELAY_MS = parseNumberEnv(process.env.APARTMENTS_RETRY_BASE_DELAY_MS, 20000)
export const CITY_COOLDOWN_MIN_MS = parseNumberEnv(
  process.env.APARTMENTS_CITY_COOLDOWN_MIN_MS,
  180000,
)
export const CITY_COOLDOWN_MAX_MS = parseNumberEnv(
  process.env.APARTMENTS_CITY_COOLDOWN_MAX_MS,
  600000,
)
export const PROXY_SERVER = process.env.SCRAPER_PROXY_SERVER ?? ""

const buildApartmentsUrl = (citySlug: string): string => {
  return `https://www.apartments.com/houses/${citySlug}/min-${MIN_BEDS}-bedrooms-${MIN_PRICE}-to-${MAX_PRICE}/`
}

export const CITY_TARGETS: CityTarget[] = [
  {
    key: "san-francisco",
    label: "San Francisco, CA",
    url: buildApartmentsUrl("san-francisco-ca"),
    requiredLocationKeywords: ["san francisco"],
  },
  {
    key: "daly-city",
    label: "Daly City, CA",
    url: buildApartmentsUrl("daly-city-ca"),
    requiredLocationKeywords: ["daly city"],
  },
  {
    key: "south-san-francisco",
    label: "South San Francisco, CA",
    url: buildApartmentsUrl("south-san-francisco-ca"),
    requiredLocationKeywords: ["south san francisco", "south sf", "ssf"],
  },
  {
    key: "pacifica",
    label: "Pacifica, CA",
    url: buildApartmentsUrl("pacifica-ca"),
    requiredLocationKeywords: ["pacifica"],
  },
  {
    key: "san-bruno",
    label: "San Bruno, CA",
    url: buildApartmentsUrl("san-bruno-ca"),
    requiredLocationKeywords: ["san bruno"],
  },
  {
    key: "brisbane",
    label: "Brisbane, CA",
    url: buildApartmentsUrl("brisbane-ca"),
    requiredLocationKeywords: ["brisbane"],
  },
]
