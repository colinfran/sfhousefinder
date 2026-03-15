import type { CityTarget } from "./config"
import type { CraigslistRawListing, RentalListing } from "./types"

const NON_SINGLE_FAMILY_PATTERN =
  /\b(apartment|apt|condo|townhome|townhouse|duplex|triplex|quadplex|studio|loft|manufactured|mobile)\b/i

const SHARED_OR_ROOM_PATTERN = /\b(room|shared|roommate|in-law|in law|sublet)\b/i

export const isSingleFamilyHome = (raw: CraigslistRawListing, mapped: RentalListing): boolean => {
  const text = `${raw.title} ${raw.housingText}`.toLowerCase()

  if (NON_SINGLE_FAMILY_PATTERN.test(text)) {
    return false
  }

  if (/\b(single family|house|home|sfh)\b/i.test(text)) {
    return true
  }

  return mapped.beds !== null && mapped.beds >= 2
}

export const isEntirePlace = (raw: CraigslistRawListing): boolean => {
  const text = `${raw.title} ${raw.housingText}`.toLowerCase()
  return !SHARED_OR_ROOM_PATTERN.test(text)
}

/**
 * Returns false if the city target defines allowedNeighborhoods AND the
 * listing's hoodText is non-empty but doesn't match any allowed neighborhood.
 * When hoodText is absent we give the listing the benefit of the doubt.
 */
export const isInAllowedNeighborhood = (
  raw: CraigslistRawListing,
  cityTarget: CityTarget,
): boolean => {
  if (!cityTarget.allowedNeighborhoods?.length) {
    return true
  }

  const hood = raw.hoodText.replace(/[()]/g, "").trim().toLowerCase()
  if (!hood) {
    return true
  }

  return cityTarget.allowedNeighborhoods.some((allowed) => hood.includes(allowed))
}

const normalizeLocationText = (value: string): string => {
  return value.toLowerCase().replace(/[-_/]+/g, " ").replace(/\s+/g, " ").trim()
}

export const matchesTargetCity = (raw: CraigslistRawListing, cityTarget: CityTarget): boolean => {
  if (!cityTarget.requiredLocationKeywords?.length) {
    return true
  }

  const searchableText = normalizeLocationText(`${raw.title} ${raw.hoodText} ${raw.url}`)

  return cityTarget.requiredLocationKeywords.some((keyword) => {
    return searchableText.includes(normalizeLocationText(keyword))
  })
}
