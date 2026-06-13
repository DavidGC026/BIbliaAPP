import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { createFeedPost } from "@/lib/bible"

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await req.json()
    const { type, content, verseRef, verseText, isPublic, isAnnouncement, visibility } = body

    if (!type || !content) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    const vis = visibility || (isPublic === false ? "private" : "public")
    const postId = await createFeedPost(
      session.userId,
      type,
      content,
      verseRef || null,
      verseText || null,
      vis === "public",
      session.role === "admin" && !!isAnnouncement,
      vis,
    )

    return NextResponse.json({ success: true, postId })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al publicar en el feed" },
      { status: 500 }
    )
  }
}
