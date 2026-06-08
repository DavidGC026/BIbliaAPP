import { type NextRequest, NextResponse } from "next/server"

const ALLOWED_HOSTS = ["images.unsplash.com", "plus.unsplash.com"]

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get("url")
    if (!url) {
      return NextResponse.json({ error: "URL requerida." }, { status: 400 })
    }

    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return NextResponse.json({ error: "URL inválida." }, { status: 400 })
    }

    if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
      return NextResponse.json({ error: "Origen no permitido." }, { status: 403 })
    }

    const response = await fetch(url, { cache: "no-store" })
    if (!response.ok) {
      return NextResponse.json({ error: "No se pudo obtener la imagen." }, { status: response.status })
    }

    const contentType = response.headers.get("content-type") || "image/jpeg"
    const buffer = await response.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 },
    )
  }
}
