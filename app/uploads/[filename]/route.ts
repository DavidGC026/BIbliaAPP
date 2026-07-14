import { readFile } from "fs/promises"
import { join } from "path"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const CONTENT_TYPES: Record<string, string> = {
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  pdf: "application/pdf",
  png: "image/png",
  webp: "image/webp",
}

function safeUploadFilename(filename: string): boolean {
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) return false
  const extension = filename.split(".").pop()?.toLowerCase()
  return !!extension && extension in CONTENT_TYPES
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params
  if (!safeUploadFilename(filename)) {
    return new NextResponse("Invalid filename", { status: 400 })
  }

  try {
    const file = await readFile(join(process.cwd(), "public", "uploads", filename))
    const extension = filename.split(".").pop()!.toLowerCase()

    return new NextResponse(file, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": CONTENT_TYPES[extension],
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return new NextResponse("Not Found", { status: 404 })
    }
    console.error("Error serving uploaded file:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
