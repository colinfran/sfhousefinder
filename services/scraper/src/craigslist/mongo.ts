import { MongoClient } from "mongodb"
import { buildGoogleMapsUrl } from "./helpers"
import type { ScrapeOutput } from "./types"
import { emptyPersistenceSummary, type PersistenceSummary } from "../persistence"

const getMongoUri = (): string | null => {
  const mongoUri = process.env.MONGODB_URI ?? null
  if (!mongoUri || !mongoUri.startsWith("mongodb")) {
    return null
  }

  return mongoUri
}

const getMongoDbName = (mongoUri: string): string => {
  try {
    const pathName = new URL(mongoUri).pathname.replace(/^\//, "")
    if (pathName) {
      return pathName
    }
  } catch {
    return "sfhousefinder"
  }

  return "sfhousefinder"
}

export const persistToMongo = async (payload: ScrapeOutput): Promise<PersistenceSummary> => {
  const mongoUri = getMongoUri()
  if (!mongoUri) {
    console.log("MongoDB URI not configured. Skipping Mongo persistence.")
    return emptyPersistenceSummary("MongoDB URI not configured. Skipping Mongo persistence.")
  }

  const dbName = getMongoDbName(mongoUri)
  const client = new MongoClient(mongoUri)
  const foundAtDate = new Date(payload.scrapedAt)
  const now = new Date()

  try {
    await client.connect()
    const collection = client.db(dbName).collection("craigslist")

    const operations = payload.listings.map((listing) => ({
      updateOne: {
        filter: { listingId: listing.id },
        update: {
          $set: {
            ...listing,
            googleMapsUrl: listing.googleMapsUrl ?? buildGoogleMapsUrl(listing.address),
            listingId: listing.id,
            source: "craigslist",
            city: payload.filters.city,
            lastSeenAt: payload.scrapedAt,
            lastSeenAtDate: foundAtDate,
            isActive: true,
            offMarketAt: null,
            offMarketAtDate: null,
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
            foundAt: payload.scrapedAt,
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

    const currentListingIds = payload.listings.map((listing) => listing.id)
    let deactivationResult = { modifiedCount: 0 }
    let skipReason: string | null = null

    if (payload.scrapedSuccessfully && currentListingIds.length) {
      const deactivationFilter = {
        source: "craigslist",
        city: payload.filters.city,
        isActive: true,
        listingId: { $nin: currentListingIds },
      }

      deactivationResult = await collection.updateMany(deactivationFilter, {
        $set: {
          isActive: false,
          offMarketAt: payload.scrapedAt,
          offMarketAtDate: foundAtDate,
          updatedAt: now,
        },
      })

      console.log(
        `MongoDB craigslist upsert complete: matched=${result.matchedCount}, modified=${result.modifiedCount}, upserted=${result.upsertedCount}, deactivated=${deactivationResult.modifiedCount}`,
      )
    } else if (!payload.scrapedSuccessfully) {
      skipReason =
        "Scrape did not complete successfully; skipped deactivation to preserve existing listings."
      console.log(
        "Scrape did not complete successfully; skipping deactivation to preserve existing listings.",
      )
      console.log(
        `MongoDB craigslist upsert complete: matched=${result.matchedCount}, modified=${result.modifiedCount}, upserted=${result.upsertedCount}, deactivated=0`,
      )
    } else {
      skipReason =
        "No current Craigslist listings found; skipping deactivation to avoid clearing existing listings from an empty result set."
      console.log(
        "No current Craigslist listings found; skipping deactivation to avoid clearing existing listings from an empty result set.",
      )
      console.log(
        `MongoDB craigslist upsert complete: matched=${result.matchedCount}, modified=${result.modifiedCount}, upserted=${result.upsertedCount}, deactivated=0`,
      )
    }

    return {
      persisted: true,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedCount: result.upsertedCount,
      deactivatedCount: deactivationResult.modifiedCount,
      skippedDeactivation: Boolean(skipReason),
      skipReason,
    }
  } finally {
    await client.close()
  }
}
