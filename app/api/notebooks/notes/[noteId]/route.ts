import { type NextRequest, NextResponse } from "next/server"
import { getNotebookNote, updateNotebookNote, deleteNotebookNote } from "@/lib/bible"
import { getSession } from "@/lib/auth"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    const { noteId } = await params
    const idNum = Number(noteId)
    if (isNaN(idNum)) {
      return NextResponse.json({ error: "ID de nota inválido." }, { status: 400 })
    }
    const note = await getNotebookNote(idNum, session.userId)
    if (!note) {
      return NextResponse.json({ error: "Nota no encontrada o no autorizada." }, { status: 404 })
    }

    return NextResponse.json({ note })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    const { noteId } = await params
    const idNum = Number(noteId)
    if (isNaN(idNum)) {
      return NextResponse.json({ error: "ID de nota inválido." }, { status: 400 })
    }
    const { title, content, tags } = await req.json()
    if (!title || !title.trim()) {
      return NextResponse.json({ error: "El título es obligatorio." }, { status: 400 })
    }

    // Verify ownership
    const existing = await getNotebookNote(idNum, session.userId)
    if (!existing) {
      return NextResponse.json({ error: "Nota no encontrada o no autorizada." }, { status: 404 })
    }

    let tagsStr: string | undefined = undefined
    if (tags !== undefined) {
      tagsStr = Array.isArray(tags) ? JSON.stringify(tags) : String(tags)
    }

    await updateNotebookNote(idNum, title.trim(), content ?? "", tagsStr)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    const { noteId } = await params
    const idNum = Number(noteId)
    if (isNaN(idNum)) {
      return NextResponse.json({ error: "ID de nota inválido." }, { status: 400 })
    }

    // Verify ownership
    const existing = await getNotebookNote(idNum, session.userId)
    if (!existing) {
      return NextResponse.json({ error: "Nota no encontrada o no autorizada." }, { status: 404 })
    }

    await deleteNotebookNote(idNum)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}
