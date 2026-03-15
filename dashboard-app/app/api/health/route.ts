import { getMongoDb } from "@/lib/mongodb"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

export const GET = async (): Promise<NextResponse> => {
  try {
    const db = await getMongoDb()
    const result = await db.command({ ping: 1 })

    return NextResponse.json({
      ok: true,
      engine: "mongodb",
      ping: result.ok === 1,
      checkedAt: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "MONGODB_URI must be set to a MongoDB connection string",
      },
      {
        status: 500,
      },
    )
  }
}
