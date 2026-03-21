import { buildGoogleMapsUrl, parseBaths, parseBeds, parseNumber } from "./helpers"
import type { CraigslistRawListing, RentalListing } from "./types"

const extractNeighborhoodFromTitle = (title: string): string => {
  const match = title.match(/\(([^)]+)\)\s*$/)
  return match?.[1]?.trim() ?? ""
}

const cleanMetadataPrefix = (value: string): string => {
  const normalized = value.toLowerCase().replace(/\s+/g, " ").trim()

  if (!normalized) {
    return ""
  }

  return normalized
    .replace(/^\d{1,2}\/\d{1,2}/, "")
    .replace(/^\d+\s*(?:min|mins|hr|hrs|hour|hours)\s+ago/i, "")
    .replace(/^\d+(?:\.\d+)?\s*br/i, "")
    .replace(/^\/?\s*\d+(?:\.\d+)?\s*ba/i, "")
    .replace(/^\d+\s*ft2/i, "")
    .replace(/^\s*-\s*/, "")
    .trim()
}

const normalizeLocation = (raw: CraigslistRawListing): string => {
  const cleaned = raw.hoodText.replace(/[()]/g, "").trim()
  const withoutMetadata = cleanMetadataPrefix(cleaned)

  if (withoutMetadata && /[a-z]/i.test(withoutMetadata)) {
    return withoutMetadata
  }

  return extractNeighborhoodFromTitle(raw.title)
}

const normalizeAddress = (title: string, location: string): string => {
  if (location) {
    return location
  }

  return title
}

export const mapRentalListing = (raw: CraigslistRawListing): RentalListing => {
  const title = raw.title.trim()
  const location = normalizeLocation(raw)
  const address = normalizeAddress(title, location)

  return {
    id: raw.id || raw.url,
    title,
    location,
    address,
    price: parseNumber(raw.priceText),
    beds: parseBeds(raw.housingText),
    baths: parseBaths(raw.housingText),
    url: raw.url,
    googleMapsUrl: buildGoogleMapsUrl(address),
    homeType: "single_family_house",
    homeStatus: "FOR_RENT",
    primaryImageUrl: raw.imageUrl,
  }
}
