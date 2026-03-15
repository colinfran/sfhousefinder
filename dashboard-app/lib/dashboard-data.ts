import "server-only"

import type { Filter, Sort } from "mongodb"

import { getMongoDb, isMongoConfigured } from "@/lib/mongodb"

export type DashboardFilters = {
  city: string
  rooms: "all" | "2" | "3plus"
  source: "all" | "zillow" | "craigslist" | "apartments.com"
}

type ListingDocument = {
  address?: string
  baths?: number | null
  beds?: number | null
  city?: string
  foundAt?: string
  foundAtDate?: Date | string
  googleMapsUrl?: string
  homeStatus?: string
  homeType?: string
  isActive?: boolean
  lastSeenAt?: string
  lastSeenAtDate?: Date | string
  listingId?: string
  price?: number | null
  primaryImageUrl?: string
  source?: string
  title?: string
  location?: string
  url?: string
}

type SourceCollectionConfig = {
  collectionName: "zillow" | "craigslist" | "apartments.com"
  enabled: boolean
}

export type DashboardListing = {
  address: string
  baths: number | null
  beds: number | null
  city: string
  googleMapsUrl: string | null
  homeStatus: string
  homeType: string
  id: string
  isActive: boolean
  lastSeenAt: string | null
  price: number | null
  primaryImageUrl: string | null
  source: string
  title: string | null
  location: string | null
  url: string
}

type DashboardSummary = {
  activeListings: number
  averageBaths: number
  averageBeds: number
  averagePrice: number | null
  inactiveListings: number
  latestSeenAt: string | null
}

export type DashboardData = {
  cheapestListings: DashboardListing[]
  cityOptions: string[]
  filteredCount: number
  listings: DashboardListing[]
  summary: DashboardSummary
}

type DashboardResult = {
  data: DashboardData
  error: string | null
}

const DEFAULT_FILTERS: DashboardFilters = {
  city: "all",
  rooms: "all",
  source: "all",
}

const SUPPORTED_CITY_OPTIONS = [
  "San Francisco, CA",
  "Daly City, CA",
  "San Mateo, CA",
  "South San Francisco, CA",
  "Pacifica, CA",
]

const emptyData: DashboardData = {
  cheapestListings: [],
  cityOptions: [],
  filteredCount: 0,
  listings: [],
  summary: {
    activeListings: 0,
    averageBaths: 0,
    averageBeds: 0,
    averagePrice: null,
    inactiveListings: 0,
    latestSeenAt: null,
  },
}

const normalizeParam = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0] ?? ""
  }

  return value ?? ""
}

const isNonEmptyString = (value: string | undefined): value is string => Boolean(value)

const APARTMENTS_SOURCE_VALUES = ["apartments", "apartments.com"] as const

const toDisplayListing = (document: ListingDocument): DashboardListing => ({
  address: document.address ?? "Unknown address",
  baths: document.baths ?? null,
  beds: document.beds ?? null,
  city: document.city ?? "Unknown city",
  googleMapsUrl: document.googleMapsUrl ?? null,
  homeStatus: document.homeStatus ?? "UNKNOWN",
  homeType: document.homeType ?? "UNKNOWN",
  id: document.listingId ?? document.address ?? crypto.randomUUID(),
  isActive: document.isActive ?? false,
  lastSeenAt:
    typeof document.lastSeenAtDate === "string"
      ? document.lastSeenAtDate
      : document.lastSeenAtDate instanceof Date
        ? document.lastSeenAtDate.toISOString()
        : (document.lastSeenAt ?? null),
  price: document.price ?? null,
  primaryImageUrl: document.primaryImageUrl ?? null,
  source: document.source ?? "Unknown",
  title: document.title ?? null,
  location: document.location ?? null,
  url: document.url ?? "#",
})

const buildBaseFilter = (filters: DashboardFilters): Filter<ListingDocument> => {
  const mongoFilter: Filter<ListingDocument> = {}

  if (filters.city !== "all") {
    mongoFilter.city = filters.city
  }

  if (filters.source !== "all") {
    mongoFilter.source =
      filters.source === "apartments.com" ? { $in: [...APARTMENTS_SOURCE_VALUES] } : filters.source
  }

  if (filters.rooms === "2") {
    mongoFilter.beds = Number(filters.rooms)
  }

  if (filters.rooms === "3plus") {
    mongoFilter.beds = { $gte: 3 }
  }

  return mongoFilter
}

const buildCityOptionsFilter = (filters: DashboardFilters): Filter<ListingDocument> => {
  const mongoFilter: Filter<ListingDocument> = {}

  if (filters.source !== "all") {
    mongoFilter.source =
      filters.source === "apartments.com" ? { $in: [...APARTMENTS_SOURCE_VALUES] } : filters.source
  }

  return mongoFilter
}

const listingSort: Sort = {
  foundAtDate: -1,
  lastSeenAtDate: -1,
  price: 1,
}

type SummaryAggregate = {
  activeListings: number
  inactiveListings: number
  latestSeenAt: Date | null
  priceSum: number
  priceCount: number
  bedsSum: number
  bedsCount: number
  bathsSum: number
  bathsCount: number
}

const toDate = (value: Date | string | undefined): Date | null => {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return value
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const compareListings = (left: ListingDocument, right: ListingDocument): number => {
  const leftFoundAt = toDate(left.foundAtDate ?? left.foundAt)?.getTime() ?? 0
  const rightFoundAt = toDate(right.foundAtDate ?? right.foundAt)?.getTime() ?? 0
  if (leftFoundAt !== rightFoundAt) {
    return rightFoundAt - leftFoundAt
  }

  const leftLastSeen = toDate(left.lastSeenAtDate)?.getTime() ?? 0
  const rightLastSeen = toDate(right.lastSeenAtDate)?.getTime() ?? 0
  if (leftLastSeen !== rightLastSeen) {
    return rightLastSeen - leftLastSeen
  }

  const leftPrice = left.price ?? Number.MAX_SAFE_INTEGER
  const rightPrice = right.price ?? Number.MAX_SAFE_INTEGER
  return leftPrice - rightPrice
}

const compareCheapest = (left: ListingDocument, right: ListingDocument): number => {
  const leftPrice = left.price ?? Number.MAX_SAFE_INTEGER
  const rightPrice = right.price ?? Number.MAX_SAFE_INTEGER
  if (leftPrice !== rightPrice) {
    return leftPrice - rightPrice
  }

  const leftLastSeen = toDate(left.lastSeenAtDate)?.getTime() ?? 0
  const rightLastSeen = toDate(right.lastSeenAtDate)?.getTime() ?? 0
  return rightLastSeen - leftLastSeen
}

export const parseDashboardFilters = (
  searchParams?: Record<string, string | string[] | undefined>,
): DashboardFilters => {
  const city = normalizeParam(searchParams?.city).trim()
  const roomsInput = normalizeParam(searchParams?.rooms).trim().toLowerCase()
  const sourceInput = normalizeParam(searchParams?.source).trim().toLowerCase()
  const rooms: DashboardFilters["rooms"] =
    roomsInput === "2" || roomsInput === "3plus" ? roomsInput : "all"
  const source: DashboardFilters["source"] =
    sourceInput === "zillow" ||
    sourceInput === "craigslist" ||
    sourceInput === "apartments.com" ||
    sourceInput === "apartments"
      ? sourceInput === "apartments"
        ? "apartments.com"
        : sourceInput
      : "all"

  return {
    city: city || DEFAULT_FILTERS.city,
    rooms,
    source,
  }
}

export const getDashboardData = async (filters: DashboardFilters): Promise<DashboardResult> => {
  if (!isMongoConfigured()) {
    return {
      data: emptyData,
      error: "MONGODB_URI is not configured for the dashboard runtime.",
    }
  }

  try {
    const db = await getMongoDb()

    const baseFilter = buildBaseFilter(filters)
    const displayFilter = buildBaseFilter(filters)
    const cityOptionsFilter = buildCityOptionsFilter(filters)
    const sourceCollections: SourceCollectionConfig[] = [
      {
        collectionName: "zillow",
        enabled: filters.source === "all" || filters.source === "zillow",
      },
      {
        collectionName: "craigslist",
        enabled: filters.source === "all" || filters.source === "craigslist",
      },
      {
        collectionName: "apartments.com",
        enabled: filters.source === "all" || filters.source === "apartments.com",
      },
    ]

    const enabledCollections = sourceCollections
      .filter((sourceCollection) => sourceCollection.enabled)
      .map((sourceCollection) => db.collection<ListingDocument>(sourceCollection.collectionName))

    const summaryPipeline = [
      {
        $match: baseFilter,
      },
      {
        $group: {
          _id: null,
          activeListings: {
            $sum: {
              $cond: [{ $eq: ["$isActive", true] }, 1, 0],
            },
          },
          inactiveListings: {
            $sum: {
              $cond: [{ $eq: ["$isActive", false] }, 1, 0],
            },
          },
          latestSeenAt: {
            $max: "$lastSeenAtDate",
          },
          priceSum: {
            $sum: {
              $cond: [{ $ne: ["$price", null] }, "$price", 0],
            },
          },
          priceCount: {
            $sum: {
              $cond: [{ $ne: ["$price", null] }, 1, 0],
            },
          },
          bedsSum: {
            $sum: {
              $cond: [{ $ne: ["$beds", null] }, "$beds", 0],
            },
          },
          bedsCount: {
            $sum: {
              $cond: [{ $ne: ["$beds", null] }, 1, 0],
            },
          },
          bathsSum: {
            $sum: {
              $cond: [{ $ne: ["$baths", null] }, "$baths", 0],
            },
          },
          bathsCount: {
            $sum: {
              $cond: [{ $ne: ["$baths", null] }, 1, 0],
            },
          },
        },
      },
    ]

    const [
      cityOptionsByCollection,
      countsByCollection,
      listingsByCollection,
      cheapestByCollection,
      summariesByCollection,
    ] = await Promise.all([
      Promise.all(
        enabledCollections.map((collection) => collection.distinct("city", cityOptionsFilter)),
      ),
      Promise.all(enabledCollections.map((collection) => collection.countDocuments(displayFilter))),
      Promise.all(
        enabledCollections.map((collection) =>
          collection.find(displayFilter).sort(listingSort).limit(60).toArray(),
        ),
      ),
      Promise.all(
        enabledCollections.map((collection) =>
          collection
            .find({ ...displayFilter, price: { $ne: null } })
            .sort({ price: 1, lastSeenAtDate: -1 })
            .limit(3)
            .toArray(),
        ),
      ),
      Promise.all(
        enabledCollections.map((collection) =>
          collection.aggregate<SummaryAggregate>(summaryPipeline).next(),
        ),
      ),
    ])

    const listings = listingsByCollection.flat().sort(compareListings).slice(0, 60)
    const cheapestListings = cheapestByCollection.flat().sort(compareCheapest).slice(0, 3)

    const cityOptions = [
      ...new Set([
        ...SUPPORTED_CITY_OPTIONS,
        ...cityOptionsByCollection.flat(),
        ...(filters.city !== "all" ? [filters.city] : []),
      ]),
    ]
    const filteredCount = countsByCollection.reduce((total, count) => total + count, 0)

    const summaries = summariesByCollection.filter((summary): summary is SummaryAggregate =>
      Boolean(summary),
    )

    const activeListings = summaries.reduce((total, summary) => total + summary.activeListings, 0)
    const inactiveListings = summaries.reduce(
      (total, summary) => total + summary.inactiveListings,
      0,
    )
    const totalPriceSum = summaries.reduce((total, summary) => total + summary.priceSum, 0)
    const totalPriceCount = summaries.reduce((total, summary) => total + summary.priceCount, 0)
    const totalBedsSum = summaries.reduce((total, summary) => total + summary.bedsSum, 0)
    const totalBedsCount = summaries.reduce((total, summary) => total + summary.bedsCount, 0)
    const totalBathsSum = summaries.reduce((total, summary) => total + summary.bathsSum, 0)
    const totalBathsCount = summaries.reduce((total, summary) => total + summary.bathsCount, 0)

    const latestSeenAt = summaries
      .map((summary) => summary.latestSeenAt)
      .filter((value): value is Date => value instanceof Date)
      .sort((left, right) => right.getTime() - left.getTime())[0]

    return {
      data: {
        cheapestListings: cheapestListings.map(toDisplayListing),
        cityOptions: cityOptions
          .filter(isNonEmptyString)
          .sort((left, right) => left.localeCompare(right)),
        filteredCount,
        listings: listings.map(toDisplayListing),
        summary: {
          activeListings,
          averageBaths: totalBathsCount ? totalBathsSum / totalBathsCount : 0,
          averageBeds: totalBedsCount ? totalBedsSum / totalBedsCount : 0,
          averagePrice: totalPriceCount ? totalPriceSum / totalPriceCount : null,
          inactiveListings,
          latestSeenAt: latestSeenAt ? latestSeenAt.toISOString() : null,
        },
      },
      error: null,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown MongoDB error"

    return {
      data: emptyData,
      error: message,
    }
  }
}
