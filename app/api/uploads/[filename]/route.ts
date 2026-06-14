import { readFile } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { canViewMedia } from "@/lib/media-privacy"
import { getUserMediaByFilename } from "@/lib/user-media"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  try {
    const user = getSession(req)
    if (!user) return new NextResponse("Unauthorized", { status: 401 })

    const { filename } = await params

    if (filename.includes("..") || filename.includes("/")) {
      return new NextResponse("Invalid filename", { status: 400 })
    }

    const media = await getUserMediaByFilename(filename)
    if (media) {
      const allowed = await canViewMedia(user.userId, {
        user_id: media.user_id as number,
        kind: media.kind as string,
        visibility: media.visibility as string,
      })
      if (!allowed) return new NextResponse("Forbidden", { status: 403 })
    }

    const filepath = join(process.cwd(), "public", "uploads", filename)
    if (!existsSync(filepath)) return new NextResponse("Not Found", { status: 404 })

    const fileBuffer = await readFile(filepath)

    let contentType = "application/octet-stream"
    const ext = filename.split(".").pop()?.toLowerCase()
    if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg"
    else if (ext === "png") contentType = "image/png"
    else if (ext === "webp") contentType = "image/webp"
    else if (ext === "gif") contentType = "image/gif"

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (err) {
    console.error("Error serving file:", err)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
