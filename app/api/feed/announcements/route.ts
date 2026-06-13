import { type NextRequest, NextResponse } from "next/server"
import { getAnnouncements } from "@/lib/bible"

export async function GET() {
  try {
    const announcements = await getAnnouncements(8)
    return NextResponse.json({ announcements })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}
