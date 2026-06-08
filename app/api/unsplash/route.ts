import { NextResponse } from "next/server"

// Next.js Route Cache config: cache for 1 hour to avoid hitting rate limits
export const revalidate = 3600

export async function GET() {
  try {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY
    if (!accessKey) {
      return NextResponse.json({ error: "No Unsplash API Key found" }, { status: 500 })
    }

    const url = `https://api.unsplash.com/photos/random?query=nature,landscape,mountains,sky&orientation=portrait&count=12`
    
    const response = await fetch(url, {
      headers: {
        "Authorization": `Client-ID ${accessKey}`,
        "Accept-Version": "v1"
      },
      // Ensure fetch is cached properly by Next.js
      next: { revalidate: 3600 }
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("Unsplash API Error:", errorData)
      return NextResponse.json({ error: "Error fetching from Unsplash" }, { status: response.status })
    }

    const data = await response.json()
    
    // Map data to just what we need to save bandwidth
    const images = data.map((img: any) => ({
      id: img.id,
      url: img.urls.regular,
      thumb: img.urls.thumb,
      author: img.user.name,
      authorUrl: img.user.links.html
    }))

    return NextResponse.json({ images })
  } catch (err) {
    console.error("Error in Unsplash route:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
