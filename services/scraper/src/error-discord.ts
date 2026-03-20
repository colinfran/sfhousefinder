type AlertLevel = "info" | "warning" | "error"

type DiscordAlertOptions = {
  title: string
  message: string
  source?: string
  city?: string
  level?: AlertLevel
  details?: string[]
}

const DISCORD_WEBHOOK_URL = (process.env.SCRAPER_DISCORD_WEBHOOK_URL_ERROR ?? "").trim()

const levelPrefix = (level: AlertLevel): string => {
  if (level === "error") {
    return "🚨"
  }

  if (level === "warning") {
    return "⚠️"
  }

  return "ℹ️"
}

const normalizeDetails = (details: string[] | undefined): string[] => {
  return (details ?? []).map((entry) => entry.trim()).filter(Boolean)
}

export const sendErrorDiscordAlert = async ({
  title,
  message,
  source,
  city,
  level = "info",
  details,
}: DiscordAlertOptions): Promise<void> => {
  if (!DISCORD_WEBHOOK_URL) {
    return
  }

  const lines = [
    `${levelPrefix(level)} **${title.trim()}**`,
    message.trim(),
    source ? `Source: ${source}` : "",
    city ? `City: ${city}` : "",
    ...normalizeDetails(details),
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
      console.error(`Discord alert failed: ${response.status} ${response.statusText}`)
    }
  } catch (error: unknown) {
    console.error("Discord alert failed", error)
  }
}
