import { MongoClient } from "mongodb"
import { buildGoogleMapsUrl } from "./helpers"
import type { ScrapeOutput } from "./types"

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
    return "housefinder"
  }

  return "housefinder"
}

export const persistToMongo = async (payload: ScrapeOutput): Promise<void> => {
  const mongoUri = getMongoUri()
  if (!mongoUri) {
    console.log("MongoDB URI not configured. Skipping Mongo persistence.")
    return
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
            foundAt: payload.scrapedAt,
            foundAtDate,
            lastSeenAt: payload.scrapedAt,
            lastSeenAtDate: foundAtDate,
            isActive: true,
            offMarketAt: null,
            offMarketAtDate: null,
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        upsert: true,
      },
    }))

    const result = operations.length
      ? await collection.bulkWrite(operations, { ordered: false })
      : { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 }

    const currentListingIds = payload.listings.map((listing) => listing.id)

    const deactivationFilter = currentListingIds.length
      ? {
          source: "craigslist",
          city: payload.filters.city,
          isActive: true,
          listingId: { $nin: currentListingIds },
        }
      : {
          source: "craigslist",
          city: payload.filters.city,
          isActive: true,
        }

    const deactivationResult = await collection.updateMany(deactivationFilter, {
      $set: {
        isActive: false,
        offMarketAt: payload.scrapedAt,
        offMarketAtDate: foundAtDate,
        updatedAt: now,
      },
    })

    if (!operations.length) {
      console.log(
        "No current Craigslist listings found; marked prior active city listings inactive.",
      )
    }

    console.log(
      `MongoDB craigslist upsert complete: matched=${result.matchedCount}, modified=${result.modifiedCount}, upserted=${result.upsertedCount}, deactivated=${deactivationResult.modifiedCount}`,
    )
  } finally {
    await client.close()
  }
}
