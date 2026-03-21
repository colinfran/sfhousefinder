import type { PersistenceSummary } from "./persistence"

type AlertLevel = "info" | "warning" | "error"

type SuccessAlertInput = {
  source: string
  city: string
  scrapedAt: string
  count: number
  scrapedSuccessfully: boolean
  persistence: PersistenceSummary
}

const DISCORD_WEBHOOK_URL = (process.env.SCRAPER_DISCORD_WEBHOOK_URL_SUCCESS ?? "").trim()

const levelPrefix = (level: AlertLevel): string => {
  if (level === "error") {
    return "🚨"
  }

  if (level === "warning") {
    return "⚠️"
  }

  return "✅"
}

const normalizeDetails = (details: string[]): string[] => {
  return details.map((entry) => entry.trim()).filter(Boolean)
}

export const sendScrapeSuccessAlert = async ({
  source,
  city,
  scrapedAt,
  count,
  scrapedSuccessfully,
  persistence,
}: SuccessAlertInput): Promise<void> => {
  if (!DISCORD_WEBHOOK_URL) {
    return
  }

  const detailLines = [
    `Scraped at: ${scrapedAt}`,
    `Listings matched filters: ${count}`,
    `Mongo persisted: ${persistence.persisted ? "yes" : "no"}`,
    `Mongo matched existing: ${persistence.matchedCount}`,
    `Mongo modified existing: ${persistence.modifiedCount}`,
    `Mongo inserted new: ${persistence.upsertedCount}`,
    `Mongo deactivated missing: ${persistence.deactivatedCount}`,
  ]

  if (persistence.skipReason) {
    detailLines.push(`Mongo note: ${persistence.skipReason}`)
  }

  const completedWithWarnings = scrapedSuccessfully && count === 0
  const level: AlertLevel = scrapedSuccessfully && !completedWithWarnings ? "info" : "warning"
  const headline =
    scrapedSuccessfully && !completedWithWarnings
      ? `${source} scrape succeeded`
      : `${source} scrape completed with warnings`
  const lines = [
    `${levelPrefix(level)} **${headline.trim()}**`,
    (scrapedSuccessfully && !completedWithWarnings
      ? "Scrape completed and persistence summary is below."
      : scrapedSuccessfully
        ? "Scrape completed successfully but 0 listings matched filters; persistence summary is below."
        : "Scrape finished without a complete result set; persistence summary is below."
    ).trim(),
    source ? `Source: ${source}` : "",
    city ? `City: ${city}` : "",
    ...normalizeDetails(detailLines),
    `Time: ${new Date().toISOString()}`,
  ].filter(Boolean)

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        content: lines.join("\n"),
      }),
    })

    if (!response.ok) {
      console.error(`Discord success alert failed: ${response.status} ${response.statusText}`)
    }
  } catch (error: unknown) {
    console.error("Discord success alert failed", error)
  }
}
