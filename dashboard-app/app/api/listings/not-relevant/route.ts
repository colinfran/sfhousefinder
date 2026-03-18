import { NextRequest, NextResponse } from "next/server"

import { getMongoDb, isMongoConfigured } from "@/lib/mongodb"

export const runtime = "nodejs"

const SUPPORTED_COLLECTIONS = new Set(["zillow", "craigslist", "apartments.com"])

const normalizeCollectionName = (value: string): string => {
  return value === "apartments" ? "apartments.com" : value
}

type ToggleNotRelevantPayload = {
  source?: string
  listingId?: string
  notRelevant?: boolean
}

const normalizeString = (value: unknown): string => {
  return typeof value === "string" ? value.trim() : ""
}

export const PATCH = async (request: NextRequest): Promise<NextResponse> => {
  if (!isMongoConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "MongoDB connection string is not configured.",
      },
      { status: 500 },
    )
  }

  let payload: ToggleNotRelevantPayload

  try {
    payload = (await request.json()) as ToggleNotRelevantPayload
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

  if (
    !SUPPORTED_COLLECTIONS.has(source) ||
    !listingId ||
    typeof payload.notRelevant !== "boolean"
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "A valid source, listingId, and notRelevant boolean are required.",
      },
      { status: 400 },
    )
  }

  try {
    const db = await getMongoDb()
    const collection = db.collection(source)
    const result = await collection.updateOne(
      { listingId },
      {
        $set: {
          notRelevant: payload.notRelevant,
          updatedAt: new Date(),
        },
      },
    )

    if (!result.matchedCount) {
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
      notRelevant: payload.notRelevant,
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
