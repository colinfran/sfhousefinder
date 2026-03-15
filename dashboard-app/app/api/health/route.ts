import { getMongoDb } from "@/lib/mongodb"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

export const GET = async (): Promise<NextResponse> => {
  const mongoUri = process.env.MONGODB_URI ?? process.env.DATABASE_URL

  if (!mongoUri || !mongoUri.startsWith("mongodb")) {
    return NextResponse.json(
      {
        ok: false,
        error: "MONGODB_URI or DATABASE_URL must be set to a MongoDB connection string",
      },
      {
        status: 500,
      },
    )
  }

  const db = await getMongoDb()
  const result = await db.command({ ping: 1 })

  return NextResponse.json({
    ok: true,
    engine: "mongodb",
    ping: result.ok === 1,
    checkedAt: new Date().toISOString(),
  })
}
