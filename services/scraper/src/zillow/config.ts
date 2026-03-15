import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

export const MIN_PRICE = 3000
export const MAX_PRICE = 4500
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

export const NAVIGATION_TIMEOUT_MS = parseNumberEnv(process.env.ZILLOW_NAV_TIMEOUT_MS, 90000)
export const NEXT_DATA_TIMEOUT_MS = parseNumberEnv(process.env.ZILLOW_NEXT_DATA_TIMEOUT_MS, 20000)
export const MAX_SCRAPE_ATTEMPTS = parseNumberEnv(process.env.ZILLOW_MAX_ATTEMPTS, 3)
export const PRE_NAVIGATION_MIN_DELAY_MS = parseNumberEnv(
  process.env.ZILLOW_PRE_NAV_MIN_DELAY_MS,
  2000,
)
export const PRE_NAVIGATION_MAX_DELAY_MS = parseNumberEnv(
  process.env.ZILLOW_PRE_NAV_MAX_DELAY_MS,
  5000,
)
export const RETRY_BASE_DELAY_MS = parseNumberEnv(process.env.ZILLOW_RETRY_BASE_DELAY_MS, 7000)

export const PROXY_SERVER = process.env.ZILLOW_PROXY_SERVER ?? ""

export const SAN_FRANCISCO_RENTALS_URL =
  "https://www.zillow.com/san-francisco-ca/rentals/?searchQueryState=%7B%22pagination%22%3A%7B%7D%2C%22isMapVisible%22%3Atrue%2C%22mapBounds%22%3A%7B%22west%22%3A-122.63005343798828%2C%22east%22%3A-122.23660556201172%2C%22south%22%3A37.618274414457325%2C%22north%22%3A37.93197672093057%7D%2C%22usersSearchTerm%22%3A%22San%20Francisco%20CA%22%2C%22regionSelection%22%3A%5B%7B%22regionId%22%3A20330%7D%5D%2C%22filterState%22%3A%7B%22fr%22%3A%7B%22value%22%3Atrue%7D%2C%22fsba%22%3A%7B%22value%22%3Afalse%7D%2C%22fsbo%22%3A%7B%22value%22%3Afalse%7D%2C%22nc%22%3A%7B%22value%22%3Afalse%7D%2C%22cmsn%22%3A%7B%22value%22%3Afalse%7D%2C%22auc%22%3A%7B%22value%22%3Afalse%7D%2C%22fore%22%3A%7B%22value%22%3Afalse%7D%2C%22mp%22%3A%7B%22min%22%3A3000%2C%22max%22%3A4500%7D%2C%22beds%22%3A%7B%22min%22%3A2%2C%22max%22%3Anull%7D%2C%22tow%22%3A%7B%22value%22%3Afalse%7D%2C%22apco%22%3A%7B%22value%22%3Afalse%7D%2C%22apa%22%3A%7B%22value%22%3Afalse%7D%2C%22con%22%3A%7B%22value%22%3Afalse%7D%7D%2C%22isListVisible%22%3Atrue%2C%22mapZoom%22%3A11%7D"
