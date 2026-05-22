import puppeteer from "puppeteer-extra"
import StealthPlugin from "puppeteer-extra-plugin-stealth"
import { config as loadEnv } from "dotenv"
import { existsSync } from "node:fs"
import type { Browser, Page } from "puppeteer"
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
import { isEntirePlace, isSingleFamilyHome, matchesTargetCity } from "./filters"
import { buildOutputPayload, writeOutputToFile } from "./io"
import { persistToMongo } from "./mongo"
import { sendErrorDiscordAlert } from "../error-discord"
import { appendFailureHtmlLog } from "../failure-html-log"
import { applyProxyAuthentication, getProxyConfigForAttempt } from "../proxy"
import { sendScrapeSuccessAlert } from "../success-discord"
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

const SYSTEM_CHROMIUM_PATHS = [
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/snap/bin/chromium",
]

const resolveExecutablePath = (): string | undefined => {
  const configuredPath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim()
  if (configuredPath) {
    return configuredPath
  }

  for (const path of SYSTEM_CHROMIUM_PATHS) {
    if (existsSync(path)) {
      return path
    }
  }

  return undefined
}

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

const createAttemptPage = async (
  cityTarget: CityTarget,
  attempt: number,
): Promise<{ browser: Browser; page: Page }> => {
  const browserLaunchArgs = ["--no-sandbox", "--disable-blink-features=AutomationControlled"]
  const executablePath = resolveExecutablePath()
  const proxyConfig = getProxyConfigForAttempt(PROXY_SERVER, {
    source: "zillow",
    cityKey: cityTarget.key,
    attempt,
  })

  if (proxyConfig) {
    browserLaunchArgs.push(`--proxy-server=${proxyConfig.serverUrl}`)
  }

  const browser = await puppeteer.launch({
    headless: false,
    args: browserLaunchArgs,
    executablePath,
  })

  const page = await browser.newPage()
  await applyProxyAuthentication(page, proxyConfig)
  await configurePage(page)

  return { browser, page }
}

const loadListResultsWithRetries = async (
  cityTarget: CityTarget,
): Promise<{
  botProtectionDetected: boolean
  lastHtml: string
  lastTitle: string
  lastUrl: string
  listResults: ZillowListResult[]
}> => {
  let botProtectionDetected = false
  let lastHtml = ""
  let lastTitle = ""
  let lastUrl = cityTarget.url

  for (let attempt = 1; attempt <= MAX_SCRAPE_ATTEMPTS; attempt += 1) {
    if (attempt > 1) {
      const backoff = RETRY_BASE_DELAY_MS * attempt + randomInRange(1000, 4000)
      console.log(
        `Retrying ${cityTarget.label} in ${backoff}ms (attempt ${attempt}/${MAX_SCRAPE_ATTEMPTS})...`,
      )
      await sleep(backoff)
    }

    await sleep(randomInRange(PRE_NAVIGATION_MIN_DELAY_MS, PRE_NAVIGATION_MAX_DELAY_MS))

    const { browser, page } = await createAttemptPage(cityTarget, attempt)

    try {
      await page.goto(cityTarget.url, {
        waitUntil: "domcontentloaded",
        timeout: NAVIGATION_TIMEOUT_MS,
      })

      try {
        await page.waitForSelector("script#__NEXT_DATA__", { timeout: NEXT_DATA_TIMEOUT_MS })
      } catch {
        console.log("__NEXT_DATA__ script not found within timeout for this attempt.")
      }

      lastHtml = await page.content().catch(() => "")
      lastTitle = await page.title().catch(() => "")
      lastUrl = page.url()

      const listResults = extractListResults(lastHtml)

      if (listResults.length > 0) {
        return { listResults, botProtectionDetected, lastHtml, lastTitle, lastUrl }
      }

      const wasBlocked = await isBotProtectionPage(page)
      if (!wasBlocked) {
        break
      }

      if (!botProtectionDetected) {
        botProtectionDetected = true
      }

      console.log(`Zillow bot protection detected for ${cityTarget.label} on this attempt.`)
    } finally {
      await browser.close()
    }
  }

  return { listResults: [], botProtectionDetected, lastHtml, lastTitle, lastUrl }
}

const runCityScrape = async (cityTarget: CityTarget): Promise<number> => {
  console.log(`Opening Zillow rentals search: ${cityTarget.url}`)

  const { listResults, botProtectionDetected, lastHtml, lastTitle, lastUrl } =
    await loadListResultsWithRetries(cityTarget)

  if (!listResults.length) {
    await appendFailureHtmlLog({
      source: "zillow",
      city: cityTarget.label,
      reason: "No listings payload extracted after retries",
      url: lastUrl,
      title: lastTitle,
      html: lastHtml,
    })

    console.log(
      `No listing payload found for ${cityTarget.label} after retries. Zillow likely challenged this session or changed page structure.`,
    )

    if (botProtectionDetected) {
      await sendErrorDiscordAlert({
        title: "Zillow scrape produced no payload",
        message:
          "No listing payload was extracted after configured retries because bot protection persisted.",
        source: "zillow",
        city: cityTarget.label,
        level: "warning",
        details: [
          `Attempts: ${MAX_SCRAPE_ATTEMPTS}`,
          `Bot protection seen: yes`,
          `Proxy configured: ${PROXY_SERVER ? "yes" : "no"}`,
          `URL: ${lastUrl || cityTarget.url}`,
        ],
      })
    }

    return 0
  }

  const cityMatchedResults = listResults.filter((listing) => matchesTargetCity(listing, cityTarget))
  console.log(
    `${cityMatchedResults.length} Zillow listings matched ${cityTarget.label} location filters.`,
  )

  const rentals = cityMatchedResults
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

  const scrapedSuccessfully = true
  const outputPayload = buildOutputPayload(deduped, cityTarget.label, scrapedSuccessfully)

  const persistence = await persistToMongo(outputPayload)
  const outputPath = await writeOutputToFile(outputPayload, cityTarget.key)
  console.log(`Zillow JSON export written: ${outputPath}`)

  await sendScrapeSuccessAlert({
    source: "zillow",
    city: cityTarget.label,
    scrapedAt: outputPayload.scrapedAt,
    count: deduped.length,
    scrapedSuccessfully,
    persistence,
  })

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
