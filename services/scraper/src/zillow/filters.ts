import type { CityTarget } from "./config"
import type { RentalListing, ZillowListResult } from "./types"

export const isSingleFamilyHome = (listing: ZillowListResult, mapped: RentalListing): boolean => {
  const normalizedHomeType = [
    listing.homeType,
    listing.statusType,
    listing.hdpData?.homeInfo?.homeType,
    listing.hdpData?.homeInfo?.homeTypeDimension,
    mapped.homeType,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase()

  if (mapped.url.toLowerCase().includes("/apartments/")) {
    return false
  }

  if (normalizedHomeType.includes("single") && normalizedHomeType.includes("family")) {
    return true
  }

  if (
    /(apartment|condo|townhome|townhouse|multi|duplex|triplex|quadplex|co-op)/.test(
      normalizedHomeType,
    )
  ) {
    return false
  }

  return mapped.url.toLowerCase().includes("/homedetails/")
}

export const isEntirePlace = (mapped: RentalListing): boolean => {
  const normalizedAddress = mapped.address.toLowerCase()
  const looksLikeUnitRental =
    /\b(apt|apartment|unit|room)\b/.test(normalizedAddress) || /#\s*\w+/i.test(mapped.address)

  if (looksLikeUnitRental) {
    return false
  }

  return true
}

export const matchesTargetCity = (listing: ZillowListResult, cityTarget: CityTarget): boolean => {
  if (!cityTarget.requiredLocationKeywords?.length) {
    return true
  }

  const normalizedText = [listing.address, listing.detailUrl]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase()

  return cityTarget.requiredLocationKeywords.some((keyword) => normalizedText.includes(keyword))
}
