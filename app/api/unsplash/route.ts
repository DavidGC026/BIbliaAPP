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

    const url = query
      ? `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=${safeOrientation}&per_page=${perPage}&page=${page}`
      : `https://api.unsplash.com/photos/random?query=nature,landscape,mountains,sky,forest,ocean,sunset,flowers&orientation=${safeOrientation}&count=${perPage}`

    const response = await fetch(url, {
      headers,
      next: { revalidate: query ? 300 : 3600 },
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("Unsplash API Error:", errorData)
      return NextResponse.json({ error: "Error fetching from Unsplash" }, { status: response.status })
    }

    const data = await response.json()
    const images = query ? mapImages(data.results ?? []) : mapImages(Array.isArray(data) ? data : [data])
    const totalPages = query ? (data.total_pages as number | undefined) ?? 1 : null
    const hasMore = query ? page < (totalPages ?? 1) : true

    return NextResponse.json({ images, page, totalPages, hasMore })
  } catch (err) {
    console.error("Error in Unsplash route:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
