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

export const parseBeds = (housingText: string): number | null => {
  const match = housingText.toLowerCase().match(/(\d+(?:\.\d+)?)\s*br\b/)
  return match?.[1] ? Number(match[1]) : null
}

export const parseBaths = (housingText: string): number | null => {
  const match = housingText.toLowerCase().match(/(\d+(?:\.\d+)?)\s*ba\b/)
  return match?.[1] ? Number(match[1]) : null
}
