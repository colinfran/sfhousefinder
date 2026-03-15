import { buildGoogleMapsUrl, parseBaths, parseBeds, parseNumber } from "./helpers"
import type { CraigslistRawListing, RentalListing } from "./types"

const normalizeLocation = (raw: CraigslistRawListing): string => {
  return raw.hoodText.replace(/[()]/g, "").trim()
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
