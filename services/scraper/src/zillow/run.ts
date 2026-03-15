import puppeteer from "puppeteer-extra"
import StealthPlugin from "puppeteer-extra-plugin-stealth"
import { config as loadEnv } from "dotenv"
import type { Page } from "puppeteer"
import {
  CITY_COOLDOWN_MAX_MS,
  CITY_COOLDOWN_MIN_MS,
  CITY_TARGETS,
  MAX_PRICE,
  MAX_SCRAPE_ATTEMPTS,
  MIN_BEDS,
  MIN_PRICE,
  NAVIGATION_TIMEOUT_MS,
  NEXT_DATA_TIMEOUT_MS,
  PRE_NAVIGATION_MAX_DELAY_MS,
  PRE_NAVIGATION_MIN_DELAY_MS,
  PROXY_SERVER,
  RETRY_BASE_DELAY_MS,
  ROOT_ENV_PATH,
  type CityTarget,
} from "./config"
import { isEntirePlace, isSingleFamilyHome } from "./filters"
import { buildOutputPayload } from "./io"
import { persistToMongo } from "./mongo"
import { extractListResults, mapRentalListing } from "./parser"
import type { ZillowListResult } from "./types"

loadEnv({ path: ROOT_ENV_PATH })

puppeteer.use(StealthPlugin())

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7; rv:128.0) Gecko/20100101 Firefox/128.0",
]

const BOT_PROTECTION_PATTERNS = [
  /verify you are human/i,
  /press\s*&\s*hold/i,
  /captcha/i,
  /unusual traffic/i,
  /security check/i,
  /access denied/i,
  /bot detected/i,
]

const sleep = async (milliseconds: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, milliseconds))
}

const randomInRange = (minimum: number, maximum: number): number => {
  const min = Math.min(minimum, maximum)
  const max = Math.max(minimum, maximum)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const getArgValue = (flag: string): string | null => {
  const flagIndex = process.argv.findIndex((value) => value === flag)
  if (flagIndex === -1) {
    return null
  }

  return process.argv[flagIndex + 1] ?? null
}

const resolveCityTarget = (input: string): CityTarget | null => {
  const normalizedInput = input.trim().toLowerCase()

  return (
    CITY_TARGETS.find((city) => city.key === normalizedInput) ??
    CITY_TARGETS.find((city) => city.label.toLowerCase() === normalizedInput) ??
    null
  )
}

const configurePage = async (page: Page): Promise<void> => {
  await page.setViewport({
    width: randomInRange(1366, 1728),
    height: randomInRange(768, 1117),
    deviceScaleFactor: 1,
  })

  await page.setExtraHTTPHeaders({
    "accept-language": "en-US,en;q=0.9",
  })

  const userAgent = USER_AGENTS[randomInRange(0, USER_AGENTS.length - 1)]
  await page.setUserAgent(userAgent)

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false })
  })
}

const isBotProtectionPage = async (page: Page): Promise<boolean> => {
  const [title, bodyText] = await Promise.all([
    page.title().catch(() => ""),
    page.evaluate(() => document.body?.innerText?.slice(0, 6000) ?? "").catch(() => ""),
  ])

  const pageText = `${title}\n${bodyText}`
  return BOT_PROTECTION_PATTERNS.some((pattern) => pattern.test(pageText))
}

const loadListResultsWithRetries = async (
  page: Page,
  cityTarget: CityTarget,
): Promise<ZillowListResult[]> => {
  for (let attempt = 1; attempt <= MAX_SCRAPE_ATTEMPTS; attempt += 1) {
    if (attempt > 1) {
      const backoff = RETRY_BASE_DELAY_MS * attempt + randomInRange(1000, 4000)
      console.log(
        `Retrying ${cityTarget.label} in ${backoff}ms (attempt ${attempt}/${MAX_SCRAPE_ATTEMPTS})...`,
      )
      await sleep(backoff)
    }

    await sleep(randomInRange(PRE_NAVIGATION_MIN_DELAY_MS, PRE_NAVIGATION_MAX_DELAY_MS))

    await page.goto(cityTarget.url, {
      waitUntil: "domcontentloaded",
      timeout: NAVIGATION_TIMEOUT_MS,
    })

    try {
      await page.waitForSelector("script#__NEXT_DATA__", { timeout: NEXT_DATA_TIMEOUT_MS })
    } catch {
      console.log("__NEXT_DATA__ script not found within timeout for this attempt.")
    }

    const html = await page.content()
    const listResults = extractListResults(html)

    if (listResults.length > 0) {
      return listResults
    }

    const wasBlocked = await isBotProtectionPage(page)
    if (!wasBlocked) {
      break
    }

    console.log(`Zillow bot protection detected for ${cityTarget.label} on this attempt.`)
  }

  return []
}

const runCityScrape = async (cityTarget: CityTarget): Promise<number> => {
  const browserLaunchArgs = ["--no-sandbox", "--disable-blink-features=AutomationControlled"]

  if (PROXY_SERVER) {
    browserLaunchArgs.push(`--proxy-server=${PROXY_SERVER}`)
  }

  const browser = await puppeteer.launch({
    headless: false,
    args: browserLaunchArgs,
  })

  try {
    const page = await browser.newPage()

    await configurePage(page)

    console.log(`Opening Zillow rentals search: ${cityTarget.url}`)

    const listResults = await loadListResultsWithRetries(page, cityTarget)

    if (!listResults.length) {
      console.log(
        `No listing payload found for ${cityTarget.label} after retries. Zillow likely challenged this session or changed page structure.`,
      )
      return 0
    }

    const rentals = listResults
      .map((listing) => ({
        listing,
        mapped: mapRentalListing(listing),
      }))
      .filter(({ mapped, listing }) => {
        if (mapped.price === null || mapped.beds === null) {
          return false
        }

        if (mapped.price < MIN_PRICE || mapped.price > MAX_PRICE || mapped.beds < MIN_BEDS) {
          return false
        }

        if (!isSingleFamilyHome(listing, mapped)) {
          return false
        }

        if (!isEntirePlace(mapped)) {
          return false
        }

        return true
      })
      .map(({ mapped }) => mapped)

    const deduped = Array.from(new Map(rentals.map((listing) => [listing.id, listing])).values())

    console.log(`Found ${deduped.length} ${cityTarget.label} rentals matching filters.`)

    const outputPayload = buildOutputPayload(deduped, cityTarget.label)

    await persistToMongo(outputPayload)

    console.table(
      deduped.map((listing) => ({
        address: listing.address,
        price: listing.price,
        beds: listing.beds,
        baths: listing.baths,
        url: listing.url,
        googleMapsUrl: listing.googleMapsUrl,
        homeType: listing.homeType,
        homeStatus: listing.homeStatus,
        primaryImageUrl: listing.primaryImageUrl,
      })),
    )

    return deduped.length
  } finally {
    await browser.close()
  }
}

export const runZillowScraper = async (): Promise<void> => {
  const cityArg = getArgValue("--city")
  const shouldRunAllCities = process.argv.includes("--all-cities")

  if (cityArg) {
    const targetCity = resolveCityTarget(cityArg)
    if (!targetCity) {
      const supported = CITY_TARGETS.map((city) => city.key).join(", ")
      throw new Error(`Unknown city "${cityArg}". Use one of: ${supported}`)
    }

    await runCityScrape(targetCity)
    return
  }

  if (shouldRunAllCities) {
    const summary: Array<{ city: string; listings: number }> = []

    for (let index = 0; index < CITY_TARGETS.length; index += 1) {
      const cityTarget = CITY_TARGETS[index]
      console.log(`Starting scrape for ${cityTarget.label} (${cityTarget.key})...`)

      const count = await runCityScrape(cityTarget)
      summary.push({ city: cityTarget.label, listings: count })

      if (index < CITY_TARGETS.length - 1) {
        const cooldown = randomInRange(CITY_COOLDOWN_MIN_MS, CITY_COOLDOWN_MAX_MS)
        console.log(`Cooldown before next city: ${cooldown}ms`)
        await sleep(cooldown)
      }
    }

    console.table(summary)
    return
  }

  await runCityScrape(CITY_TARGETS[0])
}
