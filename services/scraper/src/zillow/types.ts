export type ZillowListResult = {
  zpid?: number | string
  id?: number | string
  address?: string
  unformattedPrice?: number
  price?: string
  beds?: number
  bds?: string | number
  baths?: number
  ba?: string | number
  detailUrl?: string
  homeType?: string
  statusType?: string
  imgSrc?: string
  carouselPhotos?: Array<{
    url?: string
  }>
  hdpData?: {
    homeInfo?: {
      photoLink?: string
      homeType?: string
      homeTypeDimension?: string
      homeStatus?: string
    }
  }
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
  scrapedSuccessfully: boolean
}
