import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { mkdir, writeFile } from "node:fs/promises"
import { MAX_PRICE, MIN_BEDS, MIN_PRICE } from "./config"
import type { RentalListing, ScrapeOutput } from "./types"

const currentFilePath = fileURLToPath(import.meta.url)
const currentDir = dirname(currentFilePath)
const OUTPUT_DIR = resolve(currentDir, "../../output")

export const buildOutputPayload = (rentals: RentalListing[], city: string): ScrapeOutput => {
  return {
    scrapedAt: new Date().toISOString(),
    filters: {
      city,
      minPrice: MIN_PRICE,
      maxPrice: MAX_PRICE,
      minBeds: MIN_BEDS,
      homeType: "single_family_house",
      spaceType: "entire_place",
    },
    count: rentals.length,
    listings: rentals,
  }
}

export const writeOutputToFile = async (
  payload: ScrapeOutput,
  cityKey: string,
): Promise<string> => {
  await mkdir(OUTPUT_DIR, { recursive: true })

  const safeCityKey = cityKey.replace(/[^a-z0-9-]/gi, "-").toLowerCase()
  const filePath = resolve(OUTPUT_DIR, `craigslist-${safeCityKey}-rentals.json`)

  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8")

  return filePath
}
