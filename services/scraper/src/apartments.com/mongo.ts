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
    return "sfhousefinder"
  }

  return "sfhousefinder"
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
    const db = client.db(dbName)
    const collectionNames = new Set(
      (await db.listCollections({}, { nameOnly: true }).toArray()).map((entry) => entry.name),
    )
    const hasLegacyCollection = collectionNames.has("apartments")
    const hasTargetCollection = collectionNames.has("apartments.com")

    if (hasLegacyCollection && !hasTargetCollection) {
      await db.collection("apartments").rename("apartments.com")
    }

    const collection = db.collection("apartments.com")

    if (hasLegacyCollection && hasTargetCollection) {
      const legacyCollection = db.collection("apartments")
      const legacyDocuments = await legacyCollection.find().toArray()

      if (legacyDocuments.length) {
        const migrationOperations = legacyDocuments
          .map((document) => {
            const listingId =
              typeof document.listingId === "string"
                ? document.listingId
                : typeof document.id === "string"
                  ? document.id
                  : typeof document.url === "string"
                    ? document.url
                    : null

            if (!listingId) {
              return null
            }

            return {
              updateOne: {
                filter: { listingId },
                update: {
                  $set: {
                    ...document,
                    listingId,
                    source: "apartments.com",
                    updatedAt: now,
                  },
                  $setOnInsert: {
                    createdAt: document.createdAt ?? now,
                  },
                },
                upsert: true,
              },
            }
          })
          .filter((operation): operation is NonNullable<typeof operation> => Boolean(operation))

        if (migrationOperations.length) {
          await collection.bulkWrite(migrationOperations, { ordered: false })
        }
      }

      await legacyCollection.drop().catch(() => undefined)
    }

    await collection.updateMany(
      { source: "apartments" },
      {
        $set: {
          source: "apartments.com",
          updatedAt: now,
        },
      },
    )

    const operations = payload.listings.map((listing) => ({
      updateOne: {
        filter: { listingId: listing.id },
        update: {
          $set: {
            ...listing,
            googleMapsUrl: listing.googleMapsUrl ?? buildGoogleMapsUrl(listing.address),
            listingId: listing.id,
            source: "apartments.com",
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
          source: "apartments.com",
          city: payload.filters.city,
          isActive: true,
          listingId: { $nin: currentListingIds },
        }
      : {
          source: "apartments.com",
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
        "No current Apartments.com listings found; marked prior active city listings inactive.",
      )
    }

    console.log(
      `MongoDB apartments.com upsert complete: matched=${result.matchedCount}, modified=${result.modifiedCount}, upserted=${result.upsertedCount}, deactivated=${deactivationResult.modifiedCount}`,
    )
  } finally {
    await client.close()
  }
}
