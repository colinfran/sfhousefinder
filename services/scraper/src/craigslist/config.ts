import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

export type CityTarget = {
  key: string
  label: string
  searchUrl: string
  neighborhoodKeywords?: string[]
  requiredLocationKeywords?: string[]
  /**
   * If set, listings whose hoodText is non-empty and does not match any of these
   * strings (case-insensitive) will be discarded. Useful for scrapes that may
   * bleed in results from neighbouring cities (e.g. San Jose appearing on the
   * SF page).
   */
  allowedNeighborhoods?: string[]
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

export const NAVIGATION_TIMEOUT_MS = parseNumberEnv(process.env.CRAIGSLIST_NAV_TIMEOUT_MS, 60000)
export const LISTINGS_WAIT_TIMEOUT_MS = parseNumberEnv(
  process.env.CRAIGSLIST_LISTINGS_TIMEOUT_MS,
  15000,
)
export const CITY_COOLDOWN_MIN_MS = parseNumberEnv(
  process.env.CRAIGSLIST_CITY_COOLDOWN_MIN_MS,
  120000,
)
export const CITY_COOLDOWN_MAX_MS = parseNumberEnv(
  process.env.CRAIGSLIST_CITY_COOLDOWN_MAX_MS,
  300000,
)
export const POST_FILTER_WAIT_TIMEOUT_MS = parseNumberEnv(
  process.env.CRAIGSLIST_POST_FILTER_WAIT_TIMEOUT_MS,
  10000,
)
export const PROXY_SERVER = process.env.SCRAPER_PROXY_SERVER ?? ""

const buildCraigslistUrl = (path: string, query?: string): string => {
  const params = new URLSearchParams({
    housing_type: "6",
    min_price: String(MIN_PRICE),
    max_price: String(MAX_PRICE),
    min_bedrooms: String(MIN_BEDS),
  })

  if (query) {
    params.set("query", query)
  }

  return `https://sfbay.craigslist.org${path}?${params.toString()}`
}

const SF_NEIGHBORHOODS = [
  "soma",
  "south beach",
  "usf",
  "panhandle",
  "bernal heights",
  "castro",
  "upper market",
  "cole valley",
  "ashbury",
  "downtown",
  "civic",
  "van ness",
  "excelsior",
  "outer mission",
  "financial district",
  "glen park",
  "lower haight",
  "haight ashbury",
  "hayes valley",
  "ingleside",
  "sfsu",
  "ccsf",
  "inner richmond",
  "inner sunset",
  "ucsf",
  "laurel hts",
  "presidio",
  "marina",
  "cow hollow",
  "mission district",
  "nob hill",
  "lower nob hill",
  "noe valley",
  "north beach",
  "telegraph hill",
  "pacific heights",
  "pac hts",
  "potrero hill",
  "richmond",
  "seacliff",
  "russian hill",
  "sunset",
  "parkside",
  "twin peaks",
  "diamond hts",
  "western addition",
  "bayview",
  "west portal",
  "forest hill",
  "visitacion valley",
  "alamo square",
  "nopa",
  "tenderloin",
  "treasure island",
  "portola",
  "san francisco",
  "sf",
]

export const CITY_TARGETS: CityTarget[] = [
  {
    key: "san-francisco",
    label: "San Francisco, CA",
    searchUrl: buildCraigslistUrl("/search/sfc/hhh"),
    allowedNeighborhoods: SF_NEIGHBORHOODS,
  },
  {
    key: "daly-city",
    label: "Daly City, CA",
    searchUrl: buildCraigslistUrl("/search/pen/house-for-rent", "daly city"),
    requiredLocationKeywords: ["daly city"],
  },
  {
    key: "south-san-francisco",
    label: "South San Francisco, CA",
    searchUrl: buildCraigslistUrl("/search/pen/house-for-rent", "south san francisco"),
    requiredLocationKeywords: ["south san francisco", "south sf", "so san francisco", "ssf"],
  },
  {
    key: "pacifica",
    label: "Pacifica, CA",
    searchUrl: buildCraigslistUrl("/search/pen/house-for-rent", "pacifica"),
    requiredLocationKeywords: ["pacifica"],
  },
  {
    key: "san-bruno",
    label: "San Bruno, CA",
    searchUrl: buildCraigslistUrl("/search/pen/house-for-rent", "san bruno"),
    requiredLocationKeywords: ["san bruno"],
  },
  {
    key: "brisbane",
    label: "Brisbane, CA",
    searchUrl: buildCraigslistUrl("/search/pen/house-for-rent", "brisbane"),
    requiredLocationKeywords: ["brisbane"],
  },
]

export const getSearchUrlForCity = (cityTarget: CityTarget): string => {
  return cityTarget.searchUrl
}
