import { type NextRequest, NextResponse } from "next/server"
import { listDevotionals, createDevotional } from "@/lib/bible"
import { getSession } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    const devotionals = await listDevotionals(session.userId)
    return NextResponse.json({ devotionals })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al obtener devocionales" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    const { title, emotion, verseRef, content } = await req.json()
    if (!title || !title.trim()) {
      return NextResponse.json({ error: "El título es obligatorio." }, { status: 400 })
    }

    const id = await createDevotional(session.userId, title.trim(), emotion, verseRef, content)
    return NextResponse.json({ id, title: title.trim(), emotion, verseRef, content })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al crear devocional" },
      { status: 500 }
    )
  }
}
