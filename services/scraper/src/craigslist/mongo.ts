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

    if (!operations.length) {
      console.log("No listings to persist to MongoDB.")
      return
    }

    const result = await collection.bulkWrite(operations, { ordered: false })

    const currentListingIds = payload.listings.map((listing) => listing.id)

    const deactivationResult =
      currentListingIds.length > 0
        ? await collection.updateMany(
            {
              source: "craigslist",
              city: payload.filters.city,
              isActive: true,
              listingId: { $nin: currentListingIds },
            },
            {
              $set: {
                isActive: false,
                offMarketAt: payload.scrapedAt,
                offMarketAtDate: foundAtDate,
                updatedAt: now,
              },
            },
          )
        : { modifiedCount: 0 }

    console.log(
      `MongoDB craigslist upsert complete: matched=${result.matchedCount}, modified=${result.modifiedCount}, upserted=${result.upsertedCount}, deactivated=${deactivationResult.modifiedCount}`,
    )
  } finally {
    await client.close()
  }
}
