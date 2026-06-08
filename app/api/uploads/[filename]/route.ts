import { type NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params
    
    // Security check to prevent path traversal
    if (filename.includes("..") || filename.includes("/")) {
      return new NextResponse("Invalid filename", { status: 400 })
    }

    const filepath = join(process.cwd(), "public", "uploads", filename)
    
    if (!existsSync(filepath)) {
      return new NextResponse("Not Found", { status: 404 })
    }

    const fileBuffer = await readFile(filepath)
    
    // Determine content type
    let contentType = "application/octet-stream"
    const ext = filename.split('.').pop()?.toLowerCase()
    if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg"
    else if (ext === "png") contentType = "image/png"
    else if (ext === "gif") contentType = "image/gif"
    else if (ext === "webp") contentType = "image/webp"
    else if (ext === "svg") contentType = "image/svg+xml"
    else if (ext === "pdf") contentType = "application/pdf"
    else if (ext === "txt") contentType = "text/plain"

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    })
  } catch (err) {
    console.error("Error serving file:", err)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
