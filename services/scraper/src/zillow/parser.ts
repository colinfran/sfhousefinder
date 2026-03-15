import { buildGoogleMapsUrl, parseNumber } from "./helpers"
import type { RentalListing, ZillowListResult } from "./types"

export const extractListResults = (html: string): ZillowListResult[] => {
  const nextDataMatch = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">\s*([\s\S]*?)\s*<\/script>/,
  )

  if (!nextDataMatch?.[1]) {
    return []
  }

  let payload: unknown
  try {
    payload = JSON.parse(nextDataMatch[1])
  } catch {
    return []
  }

  const data = payload as {
    props?: {
      pageProps?: {
        searchPageState?: {
          cat1?: { searchResults?: { listResults?: ZillowListResult[] } }
          cat2?: { searchResults?: { listResults?: ZillowListResult[] } }
        }
      }
    }
  }

  return (
    data.props?.pageProps?.searchPageState?.cat1?.searchResults?.listResults ??
    data.props?.pageProps?.searchPageState?.cat2?.searchResults?.listResults ??
    []
  )
}

export const mapRentalListing = (listing: ZillowListResult): RentalListing => {
  const price = listing.unformattedPrice ?? parseNumber(listing.price)
  const beds = listing.beds ?? parseNumber(listing.bds)
  const baths = listing.baths ?? parseNumber(listing.ba)
  const detailUrl = listing.detailUrl
  const absoluteUrl = detailUrl
    ? detailUrl.startsWith("http")
      ? detailUrl
      : `https://www.zillow.com${detailUrl}`
    : ""

  const primaryImageUrl =
    listing.imgSrc ??
    listing.hdpData?.homeInfo?.photoLink ??
    (listing.carouselPhotos ?? [])
      .map((photo) => photo.url)
      .find((photoUrl) => Boolean(photoUrl)) ??
    ""

  const homeType =
    listing.hdpData?.homeInfo?.homeType ??
    listing.hdpData?.homeInfo?.homeTypeDimension ??
    listing.homeType ??
    ""

  const homeStatus = listing.hdpData?.homeInfo?.homeStatus ?? listing.statusType ?? ""

  return {
    id: String(listing.zpid ?? listing.id ?? absoluteUrl ?? Math.random()),
    address: listing.address ?? "",
    price,
    beds,
    baths,
    url: absoluteUrl,
    googleMapsUrl: buildGoogleMapsUrl(listing.address ?? ""),
    homeType,
    homeStatus,
    primaryImageUrl,
  }
}
