export type ApartmentsRawListing = {
  id: string
  title: string
  address: string
  priceText: string
  bedsText: string
  propertyTypeText: string
  url: string
  imageUrl: string
}

export type RentalListing = {
  id: string
  address: string
  price: number | null
  beds: number | null
  baths: number | null
  url: string
  googleMapsUrl: string
  homeType: string
  homeStatus: string
  primaryImageUrl: string
}

export type ScrapeFilters = {
  city: string
  minPrice: number
  maxPrice: number
  minBeds: number
  homeType: string
  spaceType: string
}

export type ScrapeOutput = {
  scrapedAt: string
  filters: ScrapeFilters
  count: number
  listings: RentalListing[]
}
