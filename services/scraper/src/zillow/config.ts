import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { config as loadEnv } from "dotenv"

export type CityTarget = {
  key: string
  label: string
  url: string
}

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
loadEnv({ path: ROOT_ENV_PATH })

export const NAVIGATION_TIMEOUT_MS = parseNumberEnv(process.env.ZILLOW_NAV_TIMEOUT_MS, 90000)
export const NEXT_DATA_TIMEOUT_MS = parseNumberEnv(process.env.ZILLOW_NEXT_DATA_TIMEOUT_MS, 20000)
export const MAX_SCRAPE_ATTEMPTS = parseNumberEnv(process.env.ZILLOW_MAX_ATTEMPTS, 3)
export const PRE_NAVIGATION_MIN_DELAY_MS = parseNumberEnv(
  process.env.ZILLOW_PRE_NAV_MIN_DELAY_MS,
  10000,
)
export const PRE_NAVIGATION_MAX_DELAY_MS = parseNumberEnv(
  process.env.ZILLOW_PRE_NAV_MAX_DELAY_MS,
  30000,
)
export const RETRY_BASE_DELAY_MS = parseNumberEnv(process.env.ZILLOW_RETRY_BASE_DELAY_MS, 20000)
export const CITY_COOLDOWN_MIN_MS = parseNumberEnv(process.env.ZILLOW_CITY_COOLDOWN_MIN_MS, 180000)
export const CITY_COOLDOWN_MAX_MS = parseNumberEnv(process.env.ZILLOW_CITY_COOLDOWN_MAX_MS, 600000)

export const PROXY_SERVER = process.env.SCRAPER_PROXY_SERVER ?? ""

export const SAN_FRANCISCO_RENTALS_URL =
  "https://www.zillow.com/san-francisco-ca/rentals/?searchQueryState=%7B%22pagination%22%3A%7B%7D%2C%22isMapVisible%22%3Atrue%2C%22mapBounds%22%3A%7B%22west%22%3A-122.63005343798828%2C%22east%22%3A-122.23660556201172%2C%22south%22%3A37.618274414457325%2C%22north%22%3A37.93197672093057%7D%2C%22usersSearchTerm%22%3A%22San%20Francisco%20CA%22%2C%22regionSelection%22%3A%5B%7B%22regionId%22%3A20330%7D%5D%2C%22filterState%22%3A%7B%22fr%22%3A%7B%22value%22%3Atrue%7D%2C%22fsba%22%3A%7B%22value%22%3Afalse%7D%2C%22fsbo%22%3A%7B%22value%22%3Afalse%7D%2C%22nc%22%3A%7B%22value%22%3Afalse%7D%2C%22cmsn%22%3A%7B%22value%22%3Afalse%7D%2C%22auc%22%3A%7B%22value%22%3Afalse%7D%2C%22fore%22%3A%7B%22value%22%3Afalse%7D%2C%22mp%22%3A%7B%22min%22%3A3000%2C%22max%22%3A4500%7D%2C%22beds%22%3A%7B%22min%22%3A2%2C%22max%22%3Anull%7D%2C%22tow%22%3A%7B%22value%22%3Afalse%7D%2C%22apco%22%3A%7B%22value%22%3Afalse%7D%2C%22apa%22%3A%7B%22value%22%3Afalse%7D%2C%22con%22%3A%7B%22value%22%3Afalse%7D%7D%2C%22isListVisible%22%3Atrue%2C%22mapZoom%22%3A11%7D"

export const DALY_CITY_RENTALS_URL =
  "https://www.zillow.com/daly-city-ca/rentals/?searchQueryState=%7B%22isMapVisible%22%3Atrue%2C%22mapBounds%22%3A%7B%22north%22%3A37.717727763051265%2C%22south%22%3A37.63919955800052%2C%22east%22%3A-122.39112040429686%2C%22west%22%3A-122.5147165957031%7D%2C%22filterState%22%3A%7B%22fr%22%3A%7B%22value%22%3Atrue%7D%2C%22fsba%22%3A%7B%22value%22%3Afalse%7D%2C%22fsbo%22%3A%7B%22value%22%3Afalse%7D%2C%22nc%22%3A%7B%22value%22%3Afalse%7D%2C%22cmsn%22%3A%7B%22value%22%3Afalse%7D%2C%22auc%22%3A%7B%22value%22%3Afalse%7D%2C%22fore%22%3A%7B%22value%22%3Afalse%7D%2C%22mp%22%3A%7B%22min%22%3A3000%2C%22max%22%3A4500%7D%2C%22beds%22%3A%7B%22min%22%3A2%2C%22max%22%3Anull%7D%2C%22land%22%3A%7B%22value%22%3Afalse%7D%2C%22manu%22%3A%7B%22value%22%3Afalse%7D%2C%22mf%22%3A%7B%22value%22%3Afalse%7D%2C%22apco%22%3A%7B%22value%22%3Afalse%7D%2C%22tow%22%3A%7B%22value%22%3Afalse%7D%2C%22apa%22%3A%7B%22value%22%3Afalse%7D%2C%22con%22%3A%7B%22value%22%3Afalse%7D%7D%2C%22isListVisible%22%3Atrue%2C%22mapZoom%22%3A13%2C%22curatedCollection%22%3Anull%2C%22category%22%3A%22cat1%22%2C%22usersSearchTerm%22%3A%22Daly%20City%2C%20CA%22%2C%22regionSelection%22%3A%5B%7B%22regionId%22%3A31163%2C%22regionType%22%3A6%7D%5D%7D"

export const SOUTH_SAN_FRANCISCO_RENTALS_URL =
  "https://www.zillow.com/south-san-francisco-ca/rentals/?searchQueryState=%7B%22isMapVisible%22%3Atrue%2C%22mapBounds%22%3A%7B%22north%22%3A37.695895656587524%2C%22south%22%3A37.617344336188886%2C%22east%22%3A-122.36132640429688%2C%22west%22%3A-122.48492259570313%7D%2C%22filterState%22%3A%7B%22fr%22%3A%7B%22value%22%3Atrue%7D%2C%22fsba%22%3A%7B%22value%22%3Afalse%7D%2C%22fsbo%22%3A%7B%22value%22%3Afalse%7D%2C%22nc%22%3A%7B%22value%22%3Afalse%7D%2C%22cmsn%22%3A%7B%22value%22%3Afalse%7D%2C%22auc%22%3A%7B%22value%22%3Afalse%7D%2C%22fore%22%3A%7B%22value%22%3Afalse%7D%2C%22mp%22%3A%7B%22min%22%3A3000%2C%22max%22%3A4500%7D%2C%22beds%22%3A%7B%22min%22%3A2%2C%22max%22%3Anull%7D%2C%22land%22%3A%7B%22value%22%3Afalse%7D%2C%22manu%22%3A%7B%22value%22%3Afalse%7D%2C%22mf%22%3A%7B%22value%22%3Afalse%7D%2C%22apco%22%3A%7B%22value%22%3Afalse%7D%2C%22tow%22%3A%7B%22value%22%3Afalse%7D%2C%22apa%22%3A%7B%22value%22%3Afalse%7D%2C%22con%22%3A%7B%22value%22%3Afalse%7D%7D%2C%22isListVisible%22%3Atrue%2C%22mapZoom%22%3A13%2C%22curatedCollection%22%3Anull%2C%22category%22%3A%22cat1%22%2C%22usersSearchTerm%22%3A%22South%20San%20Francisco%20CA%22%2C%22regionSelection%22%3A%5B%7B%22regionId%22%3A13929%2C%22regionType%22%3A6%7D%5D%2C%22pagination%22%3A%7B%7D%7D"

export const PACIFICA_RENTALS_URL =
  "https://www.zillow.com/pacifica-ca/rentals/?searchQueryState=%7B%22isMapVisible%22%3Atrue%2C%22mapBounds%22%3A%7B%22north%22%3A37.681546430476736%2C%22south%22%3A37.52433035395449%2C%22east%22%3A-122.34150630859375%2C%22west%22%3A-122.58869869140625%7D%2C%22filterState%22%3A%7B%22fr%22%3A%7B%22value%22%3Atrue%7D%2C%22fsba%22%3A%7B%22value%22%3Afalse%7D%2C%22fsbo%22%3A%7B%22value%22%3Afalse%7D%2C%22nc%22%3A%7B%22value%22%3Afalse%7D%2C%22cmsn%22%3A%7B%22value%22%3Afalse%7D%2C%22auc%22%3A%7B%22value%22%3Afalse%7D%2C%22fore%22%3A%7B%22value%22%3Afalse%7D%2C%22mp%22%3A%7B%22min%22%3A3000%2C%22max%22%3A4500%7D%2C%22beds%22%3A%7B%22min%22%3A2%2C%22max%22%3Anull%7D%2C%22land%22%3A%7B%22value%22%3Afalse%7D%2C%22manu%22%3A%7B%22value%22%3Afalse%7D%2C%22mf%22%3A%7B%22value%22%3Afalse%7D%2C%22apco%22%3A%7B%22value%22%3Afalse%7D%2C%22apa%22%3A%7B%22value%22%3Afalse%7D%2C%22con%22%3A%7B%22value%22%3Afalse%7D%2C%22tow%22%3A%7B%22value%22%3Afalse%7D%7D%2C%22isListVisible%22%3Atrue%2C%22mapZoom%22%3A12%2C%22curatedCollection%22%3Anull%2C%22category%22%3A%22cat1%22%2C%22usersSearchTerm%22%3A%22Pacifica%20CA%22%2C%22regionSelection%22%3A%5B%7B%22regionId%22%3A19811%2C%22regionType%22%3A6%7D%5D%2C%22pagination%22%3A%7B%7D%7D"

export const SAN_BRUNO_RENTALS_URL =
  "https://www.zillow.com/san-bruno-ca/rentals/?searchQueryState=%7B%22isMapVisible%22%3Atrue%2C%22mapBounds%22%3A%7B%22north%22%3A37.66023372769824%2C%22south%22%3A37.58164467381485%2C%22east%22%3A-122.37281490429689%2C%22west%22%3A-122.49641109570314%7D%2C%22filterState%22%3A%7B%22fr%22%3A%7B%22value%22%3Atrue%7D%2C%22fsba%22%3A%7B%22value%22%3Afalse%7D%2C%22fsbo%22%3A%7B%22value%22%3Afalse%7D%2C%22nc%22%3A%7B%22value%22%3Afalse%7D%2C%22cmsn%22%3A%7B%22value%22%3Afalse%7D%2C%22auc%22%3A%7B%22value%22%3Afalse%7D%2C%22fore%22%3A%7B%22value%22%3Afalse%7D%2C%22mp%22%3A%7B%22min%22%3A3000%2C%22max%22%3A4500%7D%2C%22beds%22%3A%7B%22min%22%3A2%2C%22max%22%3Anull%7D%2C%22land%22%3A%7B%22value%22%3Afalse%7D%2C%22manu%22%3A%7B%22value%22%3Afalse%7D%2C%22mf%22%3A%7B%22value%22%3Afalse%7D%2C%22apco%22%3A%7B%22value%22%3Afalse%7D%2C%22tow%22%3A%7B%22value%22%3Afalse%7D%2C%22apa%22%3A%7B%22value%22%3Afalse%7D%2C%22con%22%3A%7B%22value%22%3Afalse%7D%7D%2C%22isListVisible%22%3Atrue%2C%22mapZoom%22%3A13%2C%22curatedCollection%22%3Anull%2C%22category%22%3A%22cat1%22%2C%22usersSearchTerm%22%3A%22San%20Bruno%20CA%22%2C%22regionSelection%22%3A%5B%7B%22regionId%22%3A13691%2C%22regionType%22%3A6%7D%5D%2C%22pagination%22%3A%7B%7D%7D"

export const BRISBANE_RENTALS_URL =
  "https://www.zillow.com/brisbane-ca/rentals/?searchQueryState=%7B%22isMapVisible%22%3Atrue%2C%22mapBounds%22%3A%7B%22north%22%3A37.708770614897496%2C%22south%22%3A37.66951215907323%2C%22east%22%3A-122.38055395214845%2C%22west%22%3A-122.44235204785157%7D%2C%22filterState%22%3A%7B%22fr%22%3A%7B%22value%22%3Atrue%7D%2C%22fsba%22%3A%7B%22value%22%3Afalse%7D%2C%22fsbo%22%3A%7B%22value%22%3Afalse%7D%2C%22nc%22%3A%7B%22value%22%3Afalse%7D%2C%22cmsn%22%3A%7B%22value%22%3Afalse%7D%2C%22auc%22%3A%7B%22value%22%3Afalse%7D%2C%22fore%22%3A%7B%22value%22%3Afalse%7D%2C%22mp%22%3A%7B%22min%22%3A3000%2C%22max%22%3A4500%7D%2C%22beds%22%3A%7B%22min%22%3A2%2C%22max%22%3Anull%7D%2C%22land%22%3A%7B%22value%22%3Afalse%7D%2C%22manu%22%3A%7B%22value%22%3Afalse%7D%2C%22mf%22%3A%7B%22value%22%3Afalse%7D%2C%22apco%22%3A%7B%22value%22%3Afalse%7D%2C%22tow%22%3A%7B%22value%22%3Afalse%7D%2C%22apa%22%3A%7B%22value%22%3Afalse%7D%2C%22con%22%3A%7B%22value%22%3Afalse%7D%7D%2C%22isListVisible%22%3Atrue%2C%22mapZoom%22%3A14%2C%22curatedCollection%22%3Anull%2C%22category%22%3A%22cat1%22%2C%22usersSearchTerm%22%3A%22Brisbane%2C%20CA%22%2C%22regionSelection%22%3A%5B%7B%22regionId%22%3A41987%2C%22regionType%22%3A6%7D%5D%7D"

export const CITY_TARGETS: CityTarget[] = [
  {
    key: "san-francisco",
    label: "San Francisco, CA",
    url: SAN_FRANCISCO_RENTALS_URL,
  },
  {
    key: "daly-city",
    label: "Daly City, CA",
    url: DALY_CITY_RENTALS_URL,
  },
  {
    key: "south-san-francisco",
    label: "South San Francisco, CA",
    url: SOUTH_SAN_FRANCISCO_RENTALS_URL,
  },
  {
    key: "pacifica",
    label: "Pacifica, CA",
    url: PACIFICA_RENTALS_URL,
  },
  {
    key: "san-bruno",
    label: "San Bruno, CA",
    url: SAN_BRUNO_RENTALS_URL,
  },
  {
    key: "brisbane",
    label: "Brisbane, CA",
    url: BRISBANE_RENTALS_URL,
  },
]
