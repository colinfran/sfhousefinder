import type { CityTarget } from "./config"
import type { ApartmentsRawListing, RentalListing } from "./types"

const NON_SINGLE_FAMILY_PATTERN =
  /\b(apartment|apt|condo|townhome|townhouse|duplex|triplex|quadplex|studio|loft|manufactured|mobile)\b/i

const APARTMENT_COMPLEX_PATTERN =
  /\b(apartments?|community|residences?|homes?\s+at|villas?|plaza|towers?)\b/i

const SHARED_OR_ROOM_PATTERN = /\b(room|shared|roommate|private room|room for rent)\b/i

const normalizeLocationText = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export const isSingleFamilyHome = (raw: ApartmentsRawListing, mapped: RentalListing): boolean => {
  const text = `${raw.title} ${raw.address} ${raw.propertyTypeText} ${raw.url}`.toLowerCase()

  if (NON_SINGLE_FAMILY_PATTERN.test(text)) {
    return false
  }

  if (APARTMENT_COMPLEX_PATTERN.test(text)) {
    return false
  }

  try {
    const pathname = new URL(raw.url).pathname.toLowerCase()
    if (pathname.includes("-apartments-") || pathname.includes("/apartments/")) {
      return false
    }
  } catch {
    if (raw.url.toLowerCase().includes("apartments")) {
      return false
    }
  }

  return mapped.beds !== null && mapped.beds >= 2
}

export const isEntirePlace = (raw: ApartmentsRawListing): boolean => {
  const text = `${raw.title} ${raw.address} ${raw.propertyTypeText}`.toLowerCase()
  return !SHARED_OR_ROOM_PATTERN.test(text)
}

export const matchesTargetCity = (raw: ApartmentsRawListing, cityTarget: CityTarget): boolean => {
  if (!cityTarget.requiredLocationKeywords?.length) {
    return true
  }

  const searchableText = normalizeLocationText(`${raw.title} ${raw.address} ${raw.url}`)

  return cityTarget.requiredLocationKeywords.some((keyword) => {
    return searchableText.includes(normalizeLocationText(keyword))
  })
}
