import { type NextRequest, NextResponse } from "next/server"
import { getLinksForChapter, createLink, deleteLink } from "@/lib/bible"
import { getSession } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const bookId = Number(searchParams.get("book"))
    const chapter = Number(searchParams.get("chapter"))
    if (!bookId || !chapter) {
      return NextResponse.json({ error: "Parámetros 'book' y 'chapter' requeridos." }, { status: 400 })
    }
    const links = await getLinksForChapter(bookId, chapter, session.userId)
    return NextResponse.json({ links })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    const body = await req.json()
    const { bookId, chapter, verse, noteContent } = body

    if (!bookId || !chapter || !verse) {
      return NextResponse.json({ error: "Datos del versículo incompletos." }, { status: 400 })
    }

    const id = await createLink(bookId, chapter, verse, noteContent || "", session.userId)
    return NextResponse.json({ id, success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get("id"))
    if (!id) return NextResponse.json({ error: "Parámetro 'id' requerido." }, { status: 400 })
    
    await deleteLink(id, session.userId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}
