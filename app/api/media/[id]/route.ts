import { readFile } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { canViewMedia } from "@/lib/media-privacy"
import { getUserMediaById } from "@/lib/user-media"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = getSession(req)
    const { id } = await params
    const mediaId = parseInt(id, 10)
    if (isNaN(mediaId)) return new NextResponse("Invalid id", { status: 400 })

    const media = await getUserMediaById(mediaId)
    if (!media) return new NextResponse("Not Found", { status: 404 })

    const allowed = await canViewMedia(user?.userId ?? null, {
      user_id: media.user_id as number,
      kind: media.kind as string,
      visibility: media.visibility as string,
    })
    if (!allowed) return new NextResponse("Forbidden", { status: 403 })

    const filename = media.filename as string
    if (filename.includes("..") || filename.includes("/")) {
      return new NextResponse("Invalid filename", { status: 400 })
    }

    const filepath = join(process.cwd(), "public", "uploads", filename)
    if (!existsSync(filepath)) return new NextResponse("Not Found", { status: 404 })

    const fileBuffer = await readFile(filepath)
    let contentType = (media.mime_type as string) || "application/octet-stream"
    const ext = filename.split(".").pop()?.toLowerCase()
    if (!media.mime_type) {
      if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg"
      else if (ext === "png") contentType = "image/png"
      else if (ext === "webp") contentType = "image/webp"
      else if (ext === "gif") contentType = "image/gif"
    }

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (err) {
    console.error("Error serving media:", err)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
