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

  if (address.toLowerCase().includes("undisclosed address")) {
    return ""
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}
