import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getFeed } from "@/lib/bible"

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get("limit") || "20", 10)
    const offset = parseInt(searchParams.get("offset") || "0", 10)
    const type = (searchParams.get("type") || "following") as "following" | "explore"

    const feed = await getFeed(session.userId, type, limit, offset)

    return NextResponse.json({ feed })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al obtener el feed" },
      { status: 500 }
    )
  }
}
