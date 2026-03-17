import { appendFile, mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

type FailureHtmlLogInput = {
  source: "zillow" | "craigslist" | "apartments"
  city?: string
  reason: string
  url?: string
  title?: string
  html: string
}

const currentFilePath = fileURLToPath(import.meta.url)
const currentDir = dirname(currentFilePath)
const repoRoot = resolve(currentDir, "../../..")
const logsDir = resolve(repoRoot, "logs")

export const appendFailureHtmlLog = async ({
  source,
  city,
  reason,
  url,
  title,
  html,
}: FailureHtmlLogInput): Promise<void> => {
  const timestamp = new Date().toISOString()
  const filePath = resolve(logsDir, `${source}-failure-html.log`)

  const chunks = [
    "",
    "",
    "============================================================",
    `Failure Timestamp: ${timestamp}`,
    city ? `City: ${city}` : "City: (unknown)",
    `Reason: ${reason}`,
    `URL: ${url ?? "(unknown)"}`,
    `Title: ${title ?? "(unknown)"}`,
    "------------------------------ HTML ------------------------------",
    html,
    "---------------------------- END HTML ----------------------------",
    "",
  ]

  await mkdir(logsDir, { recursive: true })
  await appendFile(filePath, `${chunks.join("\n")}\n`, "utf8")
}