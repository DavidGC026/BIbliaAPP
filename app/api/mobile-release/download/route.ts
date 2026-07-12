import { createReadStream } from "fs"
import { stat } from "fs/promises"
import { Readable } from "stream"
import { NextResponse } from "next/server"
import { getLatestMobileRelease, getMobileReleasePath } from "@/lib/mobile-release"

export async function GET() {
  const release = await getLatestMobileRelease()
  if (!release) return new NextResponse("Not Found", { status: 404 })

  const filepath = getMobileReleasePath(release.filename)
  if (!filepath) return new NextResponse("Not Found", { status: 404 })

  const info = await stat(filepath)
  const stream = createReadStream(filepath)
  const webStream = Readable.toWeb(stream) as ReadableStream

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": "application/vnd.android.package-archive",
      "Content-Disposition": `attachment; filename="${release.filename}"`,
      "Content-Length": String(info.size),
      "Cache-Control": "public, max-age=300",
    },
  })
}
