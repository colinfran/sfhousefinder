export const parseNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null
  }

  const cleaned = String(value).replace(/[^\d.]/g, "")
  if (!cleaned) {
    return null
  }

  const numeric = Number(cleaned)
  return Number.isFinite(numeric) ? numeric : null
}

export const buildGoogleMapsUrl = (address: string): string => {
  if (!address) {
    return ""
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

export const parseBeds = (value: string): number | null => {
  const match = value.toLowerCase().match(/(\d+(?:\.\d+)?)\s*beds?\b/)
  return match?.[1] ? Number(match[1]) : null
}

export const parseBaths = (value: string): number | null => {
  const match = value.toLowerCase().match(/(\d+(?:\.\d+)?)\s*baths?\b/)
  return match?.[1] ? Number(match[1]) : null
}
