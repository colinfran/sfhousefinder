import "server-only"

import type { Filter, Sort } from "mongodb"

import { getMongoDb, isMongoConfigured } from "@/lib/mongodb"

export type DashboardFilters = {
  city: string
}

type ListingDocument = {
  address?: string
  baths?: number | null
  beds?: number | null
  city?: string
  foundAt?: string
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
  url?: string
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
}

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
  url: document.url ?? "#",
})

const buildBaseFilter = (filters: DashboardFilters): Filter<ListingDocument> => {
  const mongoFilter: Filter<ListingDocument> = {
    source: "zillow",
  }

  if (filters.city !== "all") {
    mongoFilter.city = filters.city
  }

  return mongoFilter
}

const listingSort: Sort = {
  isActive: -1,
  price: 1,
  lastSeenAtDate: -1,
}

export const parseDashboardFilters = (
  searchParams?: Record<string, string | string[] | undefined>,
): DashboardFilters => {
  const city = normalizeParam(searchParams?.city).trim()

  return {
    city: city || DEFAULT_FILTERS.city,
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
    const collection = db.collection<ListingDocument>("zillow")

    const baseFilter = buildBaseFilter(filters)
    const displayFilter = buildBaseFilter(filters)

    const [cityOptions, filteredCount, listings, cheapestListings, summary] = await Promise.all([
      collection.distinct("city", { source: "zillow" }),
      collection.countDocuments(displayFilter),
      collection.find(displayFilter).sort(listingSort).limit(60).toArray(),
      collection
        .find({ ...displayFilter, price: { $ne: null } })
        .sort({ price: 1, lastSeenAtDate: -1 })
        .limit(3)
        .toArray(),
      collection
        .aggregate<{
          activeListings: number
          averageBaths: number | null
          averageBeds: number | null
          averagePrice: number | null
          inactiveListings: number
          latestSeenAt: Date | null
        }>([
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
              averagePrice: {
                $avg: "$price",
              },
              averageBeds: {
                $avg: "$beds",
              },
              averageBaths: {
                $avg: "$baths",
              },
              latestSeenAt: {
                $max: "$lastSeenAtDate",
              },
            },
          },
        ])
        .next(),
    ])

    return {
      data: {
        cheapestListings: cheapestListings.map(toDisplayListing),
        cityOptions: cityOptions
          .filter(isNonEmptyString)
          .sort((left, right) => left.localeCompare(right)),
        filteredCount,
        listings: listings.map(toDisplayListing),
        summary: {
          activeListings: summary?.activeListings ?? 0,
          averageBaths: summary?.averageBaths ?? 0,
          averageBeds: summary?.averageBeds ?? 0,
          averagePrice: summary?.averagePrice ?? null,
          inactiveListings: summary?.inactiveListings ?? 0,
          latestSeenAt: summary?.latestSeenAt ? summary.latestSeenAt.toISOString() : null,
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
