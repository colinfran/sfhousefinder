import { buildGoogleMapsUrl, parseBaths, parseBeds, parseNumber } from "./helpers"
import type { ApartmentsRawListing, RentalListing } from "./types"

export const mapRentalListing = (raw: ApartmentsRawListing): RentalListing => {
  return {
    id: raw.id || raw.url,
    address: raw.address || raw.title,
    price: parseNumber(raw.priceText),
    beds: parseBeds(raw.bedsText),
    baths: parseBaths(raw.bedsText),
    url: raw.url,
    googleMapsUrl: buildGoogleMapsUrl(raw.address || raw.title),
    homeType: "single_family_house",
    homeStatus: "FOR_RENT",
    primaryImageUrl: raw.imageUrl,
  }
}
