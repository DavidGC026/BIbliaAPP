import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getAnnouncements } from "@/lib/bible"

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    const announcements = await getAnnouncements(session?.userId ?? null, 8)
    return NextResponse.json({ announcements })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}
