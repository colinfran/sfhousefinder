import puppeteer from "puppeteer-extra"
import StealthPlugin from "puppeteer-extra-plugin-stealth"
import { config as loadEnv } from "dotenv"
import { existsSync } from "node:fs"
import type { Page } from "puppeteer"
import {
  CITY_COOLDOWN_MAX_MS,
  CITY_COOLDOWN_MIN_MS,
  CITY_TARGETS,
  LISTINGS_WAIT_TIMEOUT_MS,
  MAX_PRICE,
  MAX_SCRAPE_ATTEMPTS,
  MIN_BEDS,
  MIN_PRICE,
  NAVIGATION_TIMEOUT_MS,
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
import { mapRentalListing } from "./parser"
import { sendDiscordAlert } from "../discord"
import { appendFailureHtmlLog } from "../failure-html-log"
import type { ApartmentsRawListing } from "./types"

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

const hasNoResultsState = async (page: Page): Promise<boolean> => {
  return page.evaluate(() => {
    const resultCountText = document.querySelector(".resultCountText")?.textContent ?? ""
    if (/\b0\s+rentals?\s+available\b/i.test(resultCountText)) {
      return true
    }

    return Boolean(document.querySelector(".noResults, .searchNoResults, .zero-results"))
  })
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

const waitForListings = async (page: Page): Promise<boolean> => {
  try {
    await page.waitForSelector(
      "#placardContainer article.placard, #expendedListing, .resultCountText",
      {
        timeout: LISTINGS_WAIT_TIMEOUT_MS,
      },
    )
  } catch {
    if (await hasNoResultsState(page)) {
      return false
    }

    const pageContext = await page.evaluate(() => {
      const title = document.title
      const bodyText = (document.body?.innerText ?? "").slice(0, 400)
      return { title, bodyText }
    })

    throw new Error(
      `No Apartments.com listing rows found. title="${pageContext.title}" url="${page.url()}" bodyPreview="${pageContext.bodyText.replace(/\s+/g, " ")}"`,
    )
  }

  const rowCount = await page.evaluate(() => {
    const container = document.querySelector("#placardContainer ul")
    if (!container) {
      return 0
    }

    let count = 0
    for (const child of Array.from(container.children)) {
      if (child.querySelector("article.expendedListingWrapper, #expendedListing")) {
        break
      }

      if (child.querySelector("article.placard")) {
        count += 1
      }
    }

    return count
  })

  if (rowCount > 0) {
    return true
  }

  return !(await hasNoResultsState(page))
}

const isBotProtectionPage = async (page: Page): Promise<boolean> => {
  const [title, bodyText] = await Promise.all([
    page.title().catch(() => ""),
    page.evaluate(() => document.body?.innerText?.slice(0, 6000) ?? "").catch(() => ""),
  ])

  const pageText = `${title}\n${bodyText}`
  return BOT_PROTECTION_PATTERNS.some((pattern) => pattern.test(pageText))
}

const loadPageWithRetries = async (
  page: Page,
  cityTarget: CityTarget,
): Promise<{ hasListings: boolean; botProtectionDetected: boolean }> => {
  let botProtectionDetected = false

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

    await sleep(1200)

    const wasBlocked = await isBotProtectionPage(page)
    if (wasBlocked) {
      if (!botProtectionDetected) {
        botProtectionDetected = true

        await sendDiscordAlert({
          title: "Apartments.com challenge detected",
          message: "Apartments.com returned a bot-protection or access-denied page.",
          source: "apartments.com",
          city: cityTarget.label,
          level: "warning",
          details: [
            `Attempt: ${attempt}/${MAX_SCRAPE_ATTEMPTS}`,
            `Proxy configured: ${PROXY_SERVER ? "yes" : "no"}`,
            `URL: ${cityTarget.url}`,
          ],
        })
      }

      console.log(`Apartments.com bot protection detected for ${cityTarget.label} on this attempt.`)
      continue
    }

    try {
      const hasListings = await waitForListings(page)
      return { hasListings, botProtectionDetected }
    } catch (error) {
      const html = await page.content().catch(() => "")
      const title = await page.title().catch(() => "")

      await appendFailureHtmlLog({
        source: "apartments",
        city: cityTarget.label,
        reason: error instanceof Error ? error.message : "Apartments listings wait failed",
        url: page.url(),
        title,
        html,
      })

      throw error
    }
  }

  return { hasListings: false, botProtectionDetected }
}

const extractRows = async (page: Page): Promise<ApartmentsRawListing[]> => {
  return page.evaluate(() => {
    const container = document.querySelector("#placardContainer ul")
    if (!container) {
      return []
    }

    const listings: ApartmentsRawListing[] = []
    const seenUrls = new Set<string>()

    for (const child of Array.from(container.children)) {
      if (child.querySelector("article.expendedListingWrapper, #expendedListing")) {
        break
      }

      const card = child.querySelector<HTMLElement>("article.placard")
      if (!card) {
        continue
      }

      const primaryLink =
        card.querySelector<HTMLAnchorElement>("a.property-link[href]") ??
        card.querySelector<HTMLAnchorElement>("a[href]")
      const url = card.getAttribute("data-url") ?? primaryLink?.href ?? ""

      if (!url || seenUrls.has(url)) {
        continue
      }

      const title =
        card.querySelector<HTMLElement>(".property-title .title")?.textContent?.trim() ??
        card.querySelector<HTMLElement>(".property-title")?.textContent?.trim() ??
        ""

      const address =
        card.querySelector<HTMLElement>(".property-address")?.textContent?.trim() ?? title

      const priceText =
        card.querySelector<HTMLElement>(".priceTextBox span")?.textContent?.trim() ??
        card.querySelector<HTMLElement>(".property-pricing")?.textContent?.trim() ??
        card.querySelector<HTMLElement>(".price-range")?.textContent?.trim() ??
        ""

      const bedsText =
        card.querySelector<HTMLElement>(".bedTextBox")?.textContent?.trim() ??
        card.querySelector<HTMLElement>(".bed-range")?.textContent?.trim() ??
        card.querySelector<HTMLElement>(".property-beds")?.textContent?.trim() ??
        ""

      const propertyTypeText =
        card.querySelector<HTMLElement>(".property-type-for-rent")?.textContent?.trim() ?? ""

      const imageUrl =
        card.querySelector<HTMLImageElement>(".carousel-item img")?.src ??
        card.querySelector<HTMLImageElement>("img")?.src ??
        ""

      listings.push({
        id: card.getAttribute("data-listingid") ?? url,
        title,
        address,
        priceText,
        bedsText: bedsText.replace(/\s+/g, " "),
        propertyTypeText,
        url,
        imageUrl,
      })
      seenUrls.add(url)
    }

    return listings
  })
}

const runCityScrape = async (cityTarget: CityTarget): Promise<number> => {
  const browserLaunchArgs = ["--no-sandbox", "--disable-blink-features=AutomationControlled"]
  const executablePath = resolveExecutablePath()

  if (PROXY_SERVER) {
    browserLaunchArgs.push(`--proxy-server=${PROXY_SERVER}`)
  }

  const browser = await puppeteer.launch({
    headless: false,
    args: browserLaunchArgs,
    executablePath,
  })

  try {
    const page = await browser.newPage()
    await configurePage(page)

    console.log(`Opening Apartments.com rentals search: ${cityTarget.url}`)

    const { hasListings, botProtectionDetected } = await loadPageWithRetries(page, cityTarget)

    if (!hasListings && botProtectionDetected) {
      const html = await page.content().catch(() => "")
      const title = await page.title().catch(() => "")

      await appendFailureHtmlLog({
        source: "apartments",
        city: cityTarget.label,
        reason: "No listings payload after retries with bot-protection detected",
        url: page.url(),
        title,
        html,
      })

      await sendDiscordAlert({
        title: "Apartments.com scrape produced no payload",
        message: "No Apartments.com listing payload was extracted after configured retries.",
        source: "apartments.com",
        city: cityTarget.label,
        level: "warning",
        details: [
          `Attempts: ${MAX_SCRAPE_ATTEMPTS}`,
          `Bot protection seen: yes`,
          `Proxy configured: ${PROXY_SERVER ? "yes" : "no"}`,
          `URL: ${cityTarget.url}`,
        ],
      })

      console.log(
        `No Apartments.com listing payload found for ${cityTarget.label} after retries. Apartments.com likely challenged this session.`,
      )

      return 0
    }

    if (!hasListings) {
      console.log(`No Apartments.com listings found for ${cityTarget.label}.`)

      const outputPayload = buildOutputPayload([], cityTarget.label, false)
      await persistToMongo(outputPayload)
      await writeOutputToFile(outputPayload, cityTarget.key)
      return 0
    }

    const rawListings = await extractRows(page)

    const rentals = rawListings
      .filter((listing) => matchesTargetCity(listing, cityTarget))
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

        if (!isEntirePlace(listing)) {
          return false
        }

        return true
      })
      .map(({ mapped }) => mapped)

    const deduped = Array.from(new Map(rentals.map((listing) => [listing.id, listing])).values())

    console.log(`Found ${deduped.length} ${cityTarget.label} rentals matching filters.`)

    const scrapedSuccessfully = deduped.length > 0
    const outputPayload = buildOutputPayload(deduped, cityTarget.label, scrapedSuccessfully)

    await persistToMongo(outputPayload)
    const outputPath = await writeOutputToFile(outputPayload, cityTarget.key)

    console.log(`Wrote Apartments.com output to ${outputPath}`)
    console.table(
      deduped.map((listing) => ({
        address: listing.address,
        price: listing.price,
        beds: listing.beds,
        baths: listing.baths,
        url: listing.url,
      })),
    )

    return deduped.length
  } finally {
    await browser.close()
  }
}

export const runApartmentsScraper = async (): Promise<void> => {
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
