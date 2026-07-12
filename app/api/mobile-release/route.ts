import { NextResponse } from "next/server"
import { getLatestMobileRelease } from "@/lib/mobile-release"

export async function GET() {
  const release = await getLatestMobileRelease()
  if (!release) {
    return NextResponse.json({ available: false })
  }

  return NextResponse.json({
    available: true,
    version: release.version,
    filename: release.filename,
    size: release.size,
    downloadUrl: "/api/mobile-release/download",
  })
}
