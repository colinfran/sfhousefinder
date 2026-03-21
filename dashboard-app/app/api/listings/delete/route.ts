import { NextRequest, NextResponse } from "next/server"

import { getMongoDb, isMongoConfigured } from "@/lib/mongodb"

export const runtime = "nodejs"

const SUPPORTED_COLLECTIONS = new Set(["zillow", "craigslist", "apartments.com"])

const normalizeCollectionName = (value: string): string => {
  return value === "apartments" ? "apartments.com" : value
}

type DeleteListingPayload = {
  source?: string
  listingId?: string
}

const normalizeString = (value: unknown): string => {
  return typeof value === "string" ? value.trim() : ""
}

export const DELETE = async (request: NextRequest): Promise<NextResponse> => {
  if (!isMongoConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "MongoDB connection string is not configured.",
      },
      { status: 500 },
    )
  }

  let payload: DeleteListingPayload

  try {
    payload = (await request.json()) as DeleteListingPayload
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Request body must be valid JSON.",
      },
      { status: 400 },
    )
  }

  const source = normalizeCollectionName(normalizeString(payload.source))
  const listingId = normalizeString(payload.listingId)

  if (!SUPPORTED_COLLECTIONS.has(source) || !listingId) {
    return NextResponse.json(
      {
        ok: false,
        error: "A valid source and listingId are required.",
      },
      { status: 400 },
    )
  }

  try {
    const db = await getMongoDb()
    const collection = db.collection(source)
    const result = await collection.deleteOne({ listingId })

    if (!result.deletedCount) {
      return NextResponse.json(
        {
          ok: false,
          error: "Listing not found.",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      ok: true,
      listingId,
      source,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown MongoDB error"

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    )
  }
}
