import { runZillowScraper } from "./zillow/run"

runZillowScraper().catch((error: unknown) => {
  console.error("Scraper run failed", error)
  process.exit(1)
})
