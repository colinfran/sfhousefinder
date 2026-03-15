import "server-only"

import path from "node:path"
import { fileURLToPath } from "node:url"

import nextEnv from "@next/env"
import { Db, MongoClient } from "mongodb"

declare global {
  var mongoClientPromise: Promise<MongoClient> | undefined
}

const currentFilePath = fileURLToPath(import.meta.url)
const currentDirPath = path.dirname(currentFilePath)
const workspaceRootPath = path.resolve(currentDirPath, "../..")
const { loadEnvConfig } = nextEnv

loadEnvConfig(workspaceRootPath, globalThis.process.env.NODE_ENV !== "production")

const getMongoUri = (): string | null => {
  const mongoUri = process.env.MONGODB_URI ?? null

  if (!mongoUri || !mongoUri.startsWith("mongodb")) {
    return null
  }

  return mongoUri
}

const getMongoDbName = (mongoUri: string): string => {
  try {
    const pathname = new URL(mongoUri).pathname.replace(/^\//, "")

    if (pathname) {
      return pathname
    }
  } catch {
    return "housefinder"
  }

  return "housefinder"
}

const getMongoClient = async (): Promise<MongoClient> => {
  const mongoUri = getMongoUri()

  if (!mongoUri) {
    throw new Error("MongoDB connection string is not configured.")
  }

  if (!global.mongoClientPromise) {
    global.mongoClientPromise = new MongoClient(mongoUri).connect()
  }

  return global.mongoClientPromise
}

export const isMongoConfigured = (): boolean => getMongoUri() !== null

export const getMongoDb = async (): Promise<Db> => {
  const mongoUri = getMongoUri()

  if (!mongoUri) {
    throw new Error("MongoDB connection string is not configured.")
  }

  const client = await getMongoClient()
  return client.db(getMongoDbName(mongoUri))
}
