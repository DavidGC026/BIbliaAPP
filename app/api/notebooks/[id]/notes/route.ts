import { type NextRequest, NextResponse } from "next/server"
import { listNotebookNotes, createNotebookNote, getNotebook } from "@/lib/bible"
import { getSession } from "@/lib/auth"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    const { id } = await params
    const idNum = Number(id)
    if (isNaN(idNum)) {
      return NextResponse.json({ error: "ID de libreta inválido." }, { status: 400 })
    }

    const notebook = await getNotebook(idNum, session.userId)
    if (!notebook) {
      return NextResponse.json({ error: "Libreta no encontrada." }, { status: 404 })
    }

    const notes = await listNotebookNotes(idNum, session.userId)
    return NextResponse.json({ notes })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    const { id } = await params
    const idNum = Number(id)
    if (isNaN(idNum)) {
      return NextResponse.json({ error: "ID de libreta inválido." }, { status: 400 })
    }

    const notebook = await getNotebook(idNum, session.userId)
    if (!notebook) {
      return NextResponse.json({ error: "Libreta no encontrada." }, { status: 404 })
    }

    const { title, content } = await req.json()
    if (!title || !title.trim()) {
      return NextResponse.json({ error: "El título es obligatorio." }, { status: 400 })
    }

    const noteId = await createNotebookNote(idNum, title.trim(), content ?? "")
    return NextResponse.json({
      id: noteId,
      title: title.trim(),
      content: content ?? "",
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}
