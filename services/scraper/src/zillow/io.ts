import { MAX_PRICE, MIN_BEDS, MIN_PRICE } from "./config"
import type { RentalListing, ScrapeOutput } from "./types"

export const buildOutputPayload = (rentals: RentalListing[]): ScrapeOutput => {
  return {
    scrapedAt: new Date().toISOString(),
    filters: {
      city: "San Francisco, CA",
      minPrice: MIN_PRICE,
      maxPrice: MAX_PRICE,
      minBeds: MIN_BEDS,
      homeType: "single_family_house",
      spaceType: "entire_place",
    },
    count: rentals.length,
    listings: rentals,
  }
}
