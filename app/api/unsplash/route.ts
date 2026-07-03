import { type NextRequest, NextResponse } from "next/server"

// Next.js Route Cache config: cache for 1 hour to avoid hitting rate limits
export const revalidate = 3600

function mapImages(data: { id: string; urls: { regular: string; thumb: string }; user: { name: string; links: { html: string } } }[]) {
  return data.map((img) => ({
    id: img.id,
    url: img.urls.regular,
    thumb: img.urls.thumb,
    author: img.user.name,
    authorUrl: img.user.links.html,
  }))
}

export async function GET(req: NextRequest) {
  try {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY
    if (!accessKey) {
      return NextResponse.json({ error: "No Unsplash API Key found" }, { status: 500 })
    }

    const query = req.nextUrl.searchParams.get("query")?.trim()
    const orientation = req.nextUrl.searchParams.get("orientation")?.trim() || "portrait"
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1)
    const perPage = 30
    const validOrientations = ["portrait", "landscape", "squarish"]
    const safeOrientation = validOrientations.includes(orientation) ? orientation : "portrait"
    const headers = {
      Authorization: `Client-ID ${accessKey}`,
      "Accept-Version": "v1",
    }

    // ponytail: /photos/random con count=30 a veces devuelve 1 solo objeto; search pagina bien
    const searchQuery =
      query || "nature landscape mountains sky forest ocean sunset flowers books"
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&orientation=${safeOrientation}&per_page=${perPage}&page=${page}`

    const response = await fetch(url, {
      headers,
      next: { revalidate: 300 },
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("Unsplash API Error:", errorData)
      return NextResponse.json({ error: "Error fetching from Unsplash" }, { status: response.status })
    }

    const data = await response.json()
    const images = mapImages(data.results ?? [])
    const totalPages = (data.total_pages as number | undefined) ?? 1
    const hasMore = page < totalPages

    return NextResponse.json({ images, page, totalPages, hasMore })
  } catch (err) {
    console.error("Error in Unsplash route:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
