import { config as loadEnv } from "dotenv"
import { existsSync } from "node:fs"
import puppeteer from "puppeteer"
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
  POST_FILTER_WAIT_TIMEOUT_MS,
  PRE_NAVIGATION_MAX_DELAY_MS,
  PRE_NAVIGATION_MIN_DELAY_MS,
  PROXY_SERVER,
  RETRY_BASE_DELAY_MS,
  ROOT_ENV_PATH,
  getSearchUrlForCity,
  type CityTarget,
} from "./config"
import {
  isAllowedListingCategory,
  isEntirePlace,
  isSingleFamilyHome,
  isInAllowedNeighborhood,
  matchesTargetCity,
} from "./filters"
import { buildOutputPayload, writeOutputToFile } from "./io"
import { persistToMongo } from "./mongo"
import { sendErrorDiscordAlert } from "../error-discord"
import { appendFailureHtmlLog } from "../failure-html-log"
import { applyProxyAuthentication, getProxyConfigForAttempt } from "../proxy"
import { sendScrapeSuccessAlert } from "../success-discord"
import { mapRentalListing } from "./parser"
import type { CraigslistRawListing } from "./types"

loadEnv({ path: ROOT_ENV_PATH })

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

const RESULT_ROW_SELECTORS = [
  ".result-row",
  "div.cl-search-result",
  "li.cl-static-search-result",
  "li.cl-search-result",
  "article.cl-search-result",
  "[data-testid='search-result']",
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

const applyNeighborhoodFilters = async (page: Page, cityTarget: CityTarget): Promise<void> => {
  if (!cityTarget.neighborhoodKeywords?.length) {
    return
  }

  const selectedCount = await page.evaluate((keywords) => {
    const normalizedKeywords = keywords.map((keyword) => keyword.toLowerCase())

    const candidateNodes = Array.from(document.querySelectorAll("label, button, span, div"))
    let selected = 0

    for (const node of candidateNodes) {
      const text = (node.textContent ?? "").trim().toLowerCase()
      if (!text) {
        continue
      }

      const shouldMatch = normalizedKeywords.some((keyword) => text.includes(keyword))
      if (!shouldMatch) {
        continue
      }

      const label = node.closest("label") ?? node
      const input =
        label.querySelector<HTMLInputElement>("input[type='checkbox']") ??
        (label.previousElementSibling instanceof HTMLInputElement
          ? label.previousElementSibling
          : label.nextElementSibling instanceof HTMLInputElement
            ? label.nextElementSibling
            : null)

      if (input && !input.checked) {
        input.click()
        selected += 1
        continue
      }

      if (label instanceof HTMLElement) {
        label.click()
        selected += 1
      }
    }

    const applyButton = Array.from(
      document.querySelectorAll<HTMLElement>("button, input[type='submit']"),
    ).find((element) => {
      const text =
        element instanceof HTMLInputElement
          ? (element.value ?? "").trim().toLowerCase()
          : (element.textContent ?? "").trim().toLowerCase()
      return text === "apply" || text.includes("apply")
    })

    if (applyButton) {
      applyButton.click()
    }

    return selected
  }, cityTarget.neighborhoodKeywords)

  if (selectedCount > 0) {
    await sleep(1200)
  }
}

const hasNoResultsState = async (page: Page): Promise<boolean> => {
  return page.evaluate(() => {
    const noResultsTitle = document.querySelector(".no-results-title")?.textContent ?? ""
    if (noResultsTitle.toLowerCase().includes("no results")) {
      return true
    }

    return Boolean(document.querySelector(".no-results.no-results-search, .cl-no-results-widget"))
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

const waitForListings = async (page: Page): Promise<boolean> => {
  const selector = RESULT_ROW_SELECTORS.join(",")
  try {
    await page.waitForSelector(selector, {
      timeout: LISTINGS_WAIT_TIMEOUT_MS,
    })
    return true
  } catch {
    if (await hasNoResultsState(page)) {
      return false
    }

    const hasRows = await page.evaluate((selectors) => {
      const hasSelectorRows = selectors.some((entry) => document.querySelector(entry))
      const hasListingAnchors = Boolean(
        document.querySelector("a[href*='/apa/d/'], a[href*='/hoo/d/'], a[href*='/sub/d/']"),
      )
      return hasSelectorRows || hasListingAnchors
    }, RESULT_ROW_SELECTORS)

    if (hasRows) {
      return true
    }

    if (await hasNoResultsState(page)) {
      return false
    }

    const pageContext = await page.evaluate(() => {
      const title = document.title
      const bodyText = (document.body?.innerText ?? "").slice(0, 400)
      return { title, bodyText }
    })

    throw new Error(
      `No Craigslist listing rows found. title="${pageContext.title}" url="${page.url()}" bodyPreview="${pageContext.bodyText.replace(/\s+/g, " ")}"`,
    )
  }
}

const scrollToLoadLazyContent = async (page: Page): Promise<void> => {
  const rowHandles = await page.$$(RESULT_ROW_SELECTORS.join(","))

  for (const rowHandle of rowHandles) {
    await rowHandle.evaluate((row) => {
      row.scrollIntoView({ block: "center", behavior: "auto" })

      const images = Array.from(row.querySelectorAll("img"))
      for (const image of images) {
        const currentSrc = image.getAttribute("src") ?? ""
        if (currentSrc.startsWith("https://images.craigslist.org")) {
          continue
        }

        const fallbackSrc =
          image.getAttribute("data-src") ??
          image.getAttribute("data-lazy-src") ??
          image.getAttribute("data-original") ??
          image.getAttribute("data-imgsrc") ??
          ""

        if (fallbackSrc.startsWith("https://images.craigslist.org")) {
          image.setAttribute("src", fallbackSrc)
        }
      }
    })

    await sleep(140)
  }

  let previousHeight = 0
  let stableRounds = 0
  const maxRounds = 20

  for (let round = 0; round < maxRounds; round += 1) {
    const currentHeight = await page.evaluate(() => {
      return Math.max(document.body?.scrollHeight ?? 0, document.documentElement?.scrollHeight ?? 0)
    })

    await page.evaluate((height) => {
      window.scrollTo({ top: height, behavior: "auto" })
    }, currentHeight)

    await sleep(240)

    const nextHeight = await page.evaluate(() => {
      return Math.max(document.body?.scrollHeight ?? 0, document.documentElement?.scrollHeight ?? 0)
    })

    if (nextHeight <= previousHeight) {
      stableRounds += 1
    } else {
      stableRounds = 0
    }

    previousHeight = nextHeight

    if (stableRounds >= 3) {
      break
    }
  }

  await page.evaluate(() => {
    window.scrollTo({ top: 0, behavior: "auto" })
  })

  await sleep(1200)
}

const extractRows = async (page: Page): Promise<CraigslistRawListing[]> => {
  return page.evaluate(() => {
    const nearbySeparator = document.querySelector(".nearby-separator")

    const rowSelectors = [
      ".result-row",
      "div.cl-search-result",
      "li.cl-static-search-result",
      "li.cl-search-result",
      "article.cl-search-result",
      "[data-testid='search-result']",
    ]

    const seenRows = new Set<Element>()
    const rows = rowSelectors
      .flatMap((selector) => Array.from(document.querySelectorAll<HTMLElement>(selector)))
      .filter((row) => {
        if (!nearbySeparator) {
          return true
        }

        const relation = row.compareDocumentPosition(nearbySeparator)
        return Boolean(relation & Node.DOCUMENT_POSITION_FOLLOWING)
      })
      .filter((row) => {
        if (seenRows.has(row)) {
          return false
        }
        seenRows.add(row)
        return true
      })

    if (!rows.length) {
      const anchors = Array.from(
        document.querySelectorAll<HTMLAnchorElement>(
          "a[href*='/apa/d/'], a[href*='/hoo/d/'], a[href*='/sub/d/']",
        ),
      ).filter((anchor) => {
        if (!nearbySeparator) {
          return true
        }

        const relation = anchor.compareDocumentPosition(nearbySeparator)
        return Boolean(relation & Node.DOCUMENT_POSITION_FOLLOWING)
      })

      const uniqueByHref = new Map<string, CraigslistRawListing>()

      for (const anchor of anchors) {
        const url = anchor.href
        if (!url || uniqueByHref.has(url)) {
          continue
        }

        const container = anchor.closest("li, article, div")
        const containerText = (container?.textContent ?? "").replace(/\s+/g, " ").trim()

        const priceText = containerText.match(/\$[\d,]+/)?.[0] ?? ""
        const housingText =
          containerText.match(/\d+(?:\.\d+)?\s*br(?:\s*\/?\s*\d+(?:\.\d+)?\s*ba)?/i)?.[0] ?? ""

        const hoodText = containerText.match(/\([^)]{2,120}\)/)?.[0] ?? ""

        uniqueByHref.set(url, {
          id: anchor.getAttribute("data-id") ?? url,
          title: anchor.textContent?.trim() ?? "",
          priceText,
          housingText,
          hoodText,
          url,
          imageUrl: "",
        })
      }

      return Array.from(uniqueByHref.values())
    }

    const uniqueByUrl = new Map<string, CraigslistRawListing>()

    for (const row of rows) {
      const titleLink =
        row.querySelector<HTMLAnchorElement>("a.result-title") ??
        row.querySelector<HTMLAnchorElement>("a.cl-app-anchor") ??
        row.querySelector<HTMLAnchorElement>("a[href*='/apa/d/']") ??
        row.querySelector<HTMLAnchorElement>("a[href*='/hoo/d/']")
      const imageAnchor = row.querySelector<HTMLElement>("a.result-image")
      const imageIds = imageAnchor?.getAttribute("data-ids") ?? ""
      const firstImageId = imageIds.split(",")[0]?.split(":")[1] ?? ""
      const imageTag = row.querySelector<HTMLImageElement>("img")
      const imageSrcCandidates = [
        imageTag?.src ?? "",
        imageTag?.getAttribute("data-src") ?? "",
        imageTag?.getAttribute("srcset")?.split(" ")[0] ?? "",
      ]
      const imageFromTag =
        imageSrcCandidates.find((candidate) =>
          candidate.startsWith("https://images.craigslist.org"),
        ) ?? ""
      const imageUrl = firstImageId
        ? `https://images.craigslist.org/${firstImageId}_600x450.jpg`
        : imageFromTag

      const rawPriceText =
        row.querySelector<HTMLElement>(".result-price")?.textContent?.trim() ??
        row.querySelector<HTMLElement>(".priceinfo")?.textContent?.trim() ??
        row.querySelector<HTMLElement>("[data-testid='listing-price']")?.textContent?.trim() ??
        ""

      const bedroomsText =
        row.querySelector<HTMLElement>(".post-bedrooms")?.textContent?.trim() ??
        row.querySelector<HTMLElement>(".housing-meta .post-bedrooms")?.textContent?.trim() ??
        ""

      const bathroomsText =
        row.querySelector<HTMLElement>(".post-bathrooms")?.textContent?.trim() ??
        row.querySelector<HTMLElement>(".housing-meta .post-bathrooms")?.textContent?.trim() ??
        ""

      const rawHousingText =
        [
          row.querySelector<HTMLElement>(".housing")?.textContent?.trim() ?? "",
          [bedroomsText, bathroomsText].filter(Boolean).join(" "),
          row.querySelector<HTMLElement>("[data-testid='listing-metadata']")?.textContent?.trim() ??
            "",
        ].find((value) => Boolean(value)) ?? ""

      const rawHoodText =
        row.querySelector<HTMLElement>(".result-hood")?.textContent?.trim() ??
        row.querySelector<HTMLElement>(".result-location")?.textContent?.trim() ??
        row
          .querySelector<HTMLElement>("[data-testid='listing-neighborhood']")
          ?.textContent?.trim() ??
        ""

      const url = titleLink?.href ?? ""
      if (!url || uniqueByUrl.has(url)) {
        continue
      }

      uniqueByUrl.set(url, {
        id: row.getAttribute("data-pid") ?? url ?? crypto.randomUUID(),
        title: titleLink?.textContent?.trim() ?? "",
        priceText: rawPriceText,
        housingText: rawHousingText.replace(/\s+/g, " "),
        hoodText: rawHoodText,
        url,
        imageUrl,
      })
    }

    return Array.from(uniqueByUrl.values())
  })
}

const scrapeCityListings = async (
  page: Page,
  cityTarget: CityTarget,
): Promise<{ blocked: boolean; listings: CraigslistRawListing[] }> => {
  const searchUrl = getSearchUrlForCity(cityTarget)

  console.log(`Opening Craigslist rentals search: ${searchUrl}`)

  await page.goto(searchUrl, {
    waitUntil: "domcontentloaded",
    timeout: NAVIGATION_TIMEOUT_MS,
  })

  await applyNeighborhoodFilters(page, cityTarget)

  await sleep(Math.min(POST_FILTER_WAIT_TIMEOUT_MS, 2500))

  let hasListings = false
  try {
    hasListings = await waitForListings(page)
  } catch (error) {
    const html = await page.content().catch(() => "")
    const title = await page.title().catch(() => "")

    await appendFailureHtmlLog({
      source: "craigslist",
      city: cityTarget.label,
      reason: error instanceof Error ? error.message : "Craigslist listings wait failed",
      url: page.url(),
      title,
      html,
    })

    throw error
  }

  if (!hasListings) {
    const blocked = await isBotProtectionPage(page)

    if (blocked) {
      const html = await page.content().catch(() => "")
      const title = await page.title().catch(() => "")

      await appendFailureHtmlLog({
        source: "craigslist",
        city: cityTarget.label,
        reason: "No listings found and bot-protection page detected",
        url: page.url(),
        title,
        html,
      })

      return { blocked: true, listings: [] }
    }

    console.log(`No Craigslist listings found for ${cityTarget.label}.`)
    return { blocked: false, listings: [] }
  }

  await scrollToLoadLazyContent(page)

  return { blocked: false, listings: await extractRows(page) }
}

const createAttemptPage = async (
  cityTarget: CityTarget,
  attempt: number,
): Promise<{ browser: puppeteer.Browser; page: Page }> => {
  const executablePath = resolveExecutablePath()
  const proxyConfig = getProxyConfigForAttempt(PROXY_SERVER, {
    source: "craigslist",
    cityKey: cityTarget.key,
    attempt,
  })

  const browser = await puppeteer.launch({
    headless: false,
    args: proxyConfig
      ? ["--no-sandbox", `--proxy-server=${proxyConfig.serverUrl}`]
      : ["--no-sandbox"],
    executablePath,
  })

  const page = await browser.newPage()
  await applyProxyAuthentication(page, proxyConfig)

  await page.setExtraHTTPHeaders({
    "accept-language": "en-US,en;q=0.9",
  })

  return { browser, page }
}

const runCityScrape = async (cityTarget: CityTarget): Promise<number> => {
  let lastHtml = ""
  let lastTitle = ""
  let lastUrl = getSearchUrlForCity(cityTarget)
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

    const { browser, page } = await createAttemptPage(cityTarget, attempt)

    try {
      const scrapeResult = await scrapeCityListings(page, cityTarget)
      lastHtml = await page.content().catch(() => "")
      lastTitle = await page.title().catch(() => "")
      lastUrl = page.url()

      if (scrapeResult.blocked) {
        botProtectionDetected = true

        if (attempt === MAX_SCRAPE_ATTEMPTS) {
          await sendErrorDiscordAlert({
            title: "Craigslist scrape blocked",
            message: "No listings found because the page appears to be bot-protected.",
            source: "craigslist",
            city: cityTarget.label,
            level: "warning",
            details: [
              `Attempt: ${attempt}/${MAX_SCRAPE_ATTEMPTS}`,
              `URL: ${lastUrl || getSearchUrlForCity(cityTarget)}`,
            ],
          })
        }

        continue
      }

      const rawListings = scrapeResult.listings

      const rentals = rawListings
        .map((raw) => ({
          raw,
          mapped: mapRentalListing(raw),
        }))
        .filter(({ mapped, raw }) => {
          if (mapped.price === null || mapped.beds === null || !mapped.url) {
            return false
          }

          if (mapped.price < MIN_PRICE || mapped.price > MAX_PRICE || mapped.beds < MIN_BEDS) {
            return false
          }

          if (!isSingleFamilyHome(raw, mapped)) {
            return false
          }

          if (!isEntirePlace(raw)) {
            return false
          }

          if (!isAllowedListingCategory(raw)) {
            console.log(`  Skipping unsupported category listing: "${raw.title}" url="${raw.url}"`)
            return false
          }

          if (!isInAllowedNeighborhood(raw, cityTarget)) {
            console.log(`  Skipping out-of-area listing: "${raw.title}" hood="${raw.hoodText}"`)
            return false
          }

          if (!matchesTargetCity(raw, cityTarget)) {
            console.log(
              `  Skipping city mismatch listing: "${raw.title}" hood="${raw.hoodText}" url="${raw.url}"`,
            )
            return false
          }

          return true
        })
        .map(({ mapped }) => mapped)

      const deduped = Array.from(new Map(rentals.map((listing) => [listing.id, listing])).values())

      console.log(
        `Found ${deduped.length} ${cityTarget.label} Craigslist rentals matching filters.`,
      )

      const scrapedSuccessfully = true
      const outputPayload = buildOutputPayload(deduped, cityTarget.label, scrapedSuccessfully)
      const outputPath = await writeOutputToFile(outputPayload, cityTarget.key)
      console.log(`Craigslist JSON export written: ${outputPath}`)

      const persistence = await persistToMongo(outputPayload)

      await sendScrapeSuccessAlert({
        source: "craigslist",
        city: cityTarget.label,
        scrapedAt: outputPayload.scrapedAt,
        count: deduped.length,
        scrapedSuccessfully,
        persistence,
      })

      console.table(
        deduped.map((listing) => ({
          title: listing.title,
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

  if (botProtectionDetected) {
    await appendFailureHtmlLog({
      source: "craigslist",
      city: cityTarget.label,
      reason: "No listings found and bot-protection page detected",
      url: lastUrl,
      title: lastTitle,
      html: lastHtml,
    })

    return 0
  }

  const { browser, page } = await createAttemptPage(cityTarget, MAX_SCRAPE_ATTEMPTS + 1)

  try {
    const scrapeResult = await scrapeCityListings(page, cityTarget)
    const rawListings = scrapeResult.listings

    const rentals = rawListings
      .map((raw) => ({
        raw,
        mapped: mapRentalListing(raw),
      }))
      .filter(({ mapped, raw }) => {
        if (mapped.price === null || mapped.beds === null || !mapped.url) {
          return false
        }

        if (mapped.price < MIN_PRICE || mapped.price > MAX_PRICE || mapped.beds < MIN_BEDS) {
          return false
        }

        if (!isSingleFamilyHome(raw, mapped)) {
          return false
        }

        if (!isEntirePlace(raw)) {
          return false
        }

        if (!isAllowedListingCategory(raw)) {
          console.log(`  Skipping unsupported category listing: "${raw.title}" url="${raw.url}"`)
          return false
        }

        if (!isInAllowedNeighborhood(raw, cityTarget)) {
          console.log(`  Skipping out-of-area listing: "${raw.title}" hood="${raw.hoodText}"`)
          return false
        }

        if (!matchesTargetCity(raw, cityTarget)) {
          console.log(
            `  Skipping city mismatch listing: "${raw.title}" hood="${raw.hoodText}" url="${raw.url}"`,
          )
          return false
        }

        return true
      })
      .map(({ mapped }) => mapped)

    const deduped = Array.from(new Map(rentals.map((listing) => [listing.id, listing])).values())

    console.log(`Found ${deduped.length} ${cityTarget.label} Craigslist rentals matching filters.`)

    const scrapedSuccessfully = true
    const outputPayload = buildOutputPayload(deduped, cityTarget.label, scrapedSuccessfully)
    const outputPath = await writeOutputToFile(outputPayload, cityTarget.key)
    console.log(`Craigslist JSON export written: ${outputPath}`)

    const persistence = await persistToMongo(outputPayload)

    await sendScrapeSuccessAlert({
      source: "craigslist",
      city: cityTarget.label,
      scrapedAt: outputPayload.scrapedAt,
      count: deduped.length,
      scrapedSuccessfully,
      persistence,
    })

    console.table(
      deduped.map((listing) => ({
        title: listing.title,
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

export const runCraigslistScraper = async (): Promise<void> => {
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
      console.log(`Starting Craigslist scrape for ${cityTarget.label} (${cityTarget.key})...`)

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
