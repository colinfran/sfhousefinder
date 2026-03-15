import { runCraigslistScraper } from "./craigslist/run"
import { runZillowScraper } from "./zillow/run"
import { sendDiscordAlert } from "./notifications/discord"

const getArgValue = (flag: string): string | null => {
  const flagIndex = process.argv.findIndex((value) => value === flag)
  if (flagIndex === -1) {
    return null
  }

  return process.argv[flagIndex + 1] ?? null
}

const runSelectedScraper = async (): Promise<void> => {
  const sourceArg = (getArgValue("--source") ?? "zillow").trim().toLowerCase()

  if (sourceArg === "zillow") {
    await runZillowScraper()
    return
  }

  if (sourceArg === "craigslist") {
    await runCraigslistScraper()
    return
  }

  throw new Error('Unknown source. Use "zillow" or "craigslist" with --source.')
}

runSelectedScraper().catch(async (error: unknown) => {
  const sourceArg = (getArgValue("--source") ?? "zillow").trim().toLowerCase()

  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? (error.stack ?? "") : ""

  await sendDiscordAlert({
    title: "Scraper run failed",
    message: errorMessage,
    source: sourceArg,
    level: "error",
    details: errorStack ? [`Stack: ${errorStack.split("\n").slice(0, 4).join(" | ")}`] : undefined,
  })

  console.error("Scraper run failed", error)
  process.exit(1)
})
