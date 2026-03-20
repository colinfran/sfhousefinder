import { timingSafeEqual } from "node:crypto"

import { NextRequest, NextResponse } from "next/server"

import { getMongoDb } from "@/lib/mongodb"

export const runtime = "nodejs"

type SupportedSource = "zillow" | "craigslist" | "apartments.com"

type ImportedListingInput = {
  id?: string
  listingId?: string
  address?: string
  title?: string
  location?: string
  price?: number | null
  beds?: number | null
  baths?: number | null
  url?: string
  googleMapsUrl?: string
  homeType?: string
  homeStatus?: string
  primaryImageUrl?: string
}

type ImportPayload = {
  source?: string
  city?: string
  scrapedAt?: string
  scrapedSuccessfully?: boolean
  deactivateMissing?: boolean
  listings?: ImportedListingInput[]
}

const DEFAULT_CITY = "San Francisco, CA"

const createCorsHeaders = (): HeadersInit => ({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
})

const jsonWithCors = (body: unknown, init?: ResponseInit): NextResponse => {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...createCorsHeaders(),
      ...(init?.headers ?? {}),
    },
  })
}

const normalizeString = (value: unknown): string => {
  return typeof value === "string" ? value.trim() : ""
}

const normalizeNumber = (value: unknown): number | null => {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

const buildGoogleMapsUrl = (address: string): string => {
  if (!address) {
    return ""
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

const normalizeSource = (value: unknown): SupportedSource | null => {
  const source = normalizeString(value).toLowerCase()

  if (source === "zillow" || source === "craigslist") {
    return source
  }

  if (source === "apartments" || source === "apartments.com") {
    return "apartments.com"
  }

  return null
}

const getCollectionName = (source: SupportedSource): SupportedSource => {
  return source
}

const extractBearerToken = (request: NextRequest): string => {
  const authorizationHeader = normalizeString(request.headers.get("authorization"))
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() ?? ""
}

const secureCompare = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}

const isAuthorizedRequest = (request: NextRequest): boolean => {
  const expectedToken = normalizeString(process.env.LISTINGS_IMPORT_TOKEN)

  if (!expectedToken) {
    return process.env.NODE_ENV !== "production"
  }

  const providedToken = extractBearerToken(request)
  return providedToken !== "" && secureCompare(expectedToken, providedToken)
}

export const OPTIONS = async (): Promise<NextResponse> => {
  return new NextResponse(null, {
    status: 204,
    headers: createCorsHeaders(),
  })
}

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  if (!isAuthorizedRequest(request)) {
    return jsonWithCors(
      {
        ok: false,
        error: "Unauthorized import request.",
      },
      { status: 401 },
    )
  }

  let payload: ImportPayload

  try {
    payload = (await request.json()) as ImportPayload
  } catch {
    return jsonWithCors(
      {
        ok: false,
        error: "Request body must be valid JSON.",
      },
      { status: 400 },
    )
  }

  const source = normalizeSource(payload.source)
  if (!source) {
    return jsonWithCors(
      {
        ok: false,
        error: 'Unsupported source. Use "zillow", "craigslist", or "apartments.com".',
      },
      { status: 400 },
    )
  }

  const scrapedAt = normalizeString(payload.scrapedAt) || new Date().toISOString()
  const city = normalizeString(payload.city) || DEFAULT_CITY
  const scrapedSuccessfully = payload.scrapedSuccessfully !== false
  const deactivateMissing = payload.deactivateMissing === true
  const rawListings = Array.isArray(payload.listings) ? payload.listings : []

  const listings = rawListings
    .map((listing) => {
      const listingId = normalizeString(listing.listingId) || normalizeString(listing.id)
      const address = normalizeString(listing.address)
      const url = normalizeString(listing.url)

      if (!listingId || !address || !url) {
        return null
      }

      return {
        listingId,
        address,
        title: normalizeString(listing.title) || address,
        location: normalizeString(listing.location),
        price: normalizeNumber(listing.price),
        beds: normalizeNumber(listing.beds),
        baths: normalizeNumber(listing.baths),
        url,
        googleMapsUrl: normalizeString(listing.googleMapsUrl) || buildGoogleMapsUrl(address),
        homeType: normalizeString(listing.homeType) || "single_family_house",
        homeStatus: normalizeString(listing.homeStatus) || "FOR_RENT",
        primaryImageUrl: normalizeString(listing.primaryImageUrl),
      }
    })
    .filter((listing): listing is NonNullable<typeof listing> => Boolean(listing))

  try {
    const db = await getMongoDb()
    const collection = db.collection(getCollectionName(source))
    const foundAtDate = new Date(scrapedAt)
    const now = new Date()

    const operations = listings.map((listing) => ({
      updateOne: {
        filter: { listingId: listing.listingId },
        update: {
          $set: {
            ...listing,
            source,
            city,
            lastSeenAt: scrapedAt,
            lastSeenAtDate: foundAtDate,
            isActive: true,
            offMarketAt: null,
            offMarketAtDate: null,
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
            foundAt: scrapedAt,
            foundAtDate,
            notRelevant: false,
          },
        },
        upsert: true,
      },
    }))

    const result = operations.length
      ? await collection.bulkWrite(operations, { ordered: false })
      : { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 }

    let deactivated = 0

    if (scrapedSuccessfully && deactivateMissing && listings.length > 0) {
      const currentListingIds = listings.map((listing) => listing.listingId)
      const deactivationResult = await collection.updateMany(
        {
          source,
          city,
          isActive: true,
          listingId: { $nin: currentListingIds },
        },
        {
          $set: {
            isActive: false,
            offMarketAt: scrapedAt,
            offMarketAtDate: foundAtDate,
            updatedAt: now,
          },
        },
      )

      deactivated = deactivationResult.modifiedCount
    }

    return jsonWithCors({
      ok: true,
      source,
      city,
      imported: listings.length,
      matched: result.matchedCount,
      modified: result.modifiedCount,
      upserted: result.upsertedCount,
      deactivated,
      scrapedAt,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown import failure"

    return jsonWithCors(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    )
  }
}
