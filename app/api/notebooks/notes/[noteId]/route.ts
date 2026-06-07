import { type NextRequest, NextResponse } from "next/server"
import { getNotebookNote, updateNotebookNote, deleteNotebookNote, getNotebook } from "@/lib/bible"
import { createNote, updateNote, getNote } from "@/lib/joplin"

function statusForError(err: unknown): number {
  const message = err instanceof Error ? err.message.toLowerCase() : ""
  return message.includes("sesión") || message.includes("session") || message.includes("401") || message.includes("403")
    ? 401
    : 500
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const { noteId } = await params
    const idNum = Number(noteId)
    if (isNaN(idNum)) {
      return NextResponse.json({ error: "ID de nota inválido." }, { status: 400 })
    }
    const note = await getNotebookNote(idNum)
    if (!note) {
      return NextResponse.json({ error: "Nota no encontrada." }, { status: 404 })
    }

    let content = note.content
    if (note.joplinNoteId) {
      try {
        const sessionId = req.headers.get("x-joplin-session") || undefined
        const joplinNote = await getNote(note.joplinNoteId, sessionId)
        content = joplinNote.body
      } catch (err) {
        console.error("Error fetching note content from Joplin:", err)
      }
    }

    return NextResponse.json({
      note: {
        id: note.id,
        notebookId: note.notebookId,
        title: note.title,
        content: content,
        joplinNoteId: note.joplinNoteId,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      }
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: statusForError(err) },
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const { noteId } = await params
    const idNum = Number(noteId)
    if (isNaN(idNum)) {
      return NextResponse.json({ error: "ID de nota inválido." }, { status: 400 })
    }
    const { title, content } = await req.json()
    if (!title || !title.trim()) {
      return NextResponse.json({ error: "El título es obligatorio." }, { status: 400 })
    }

    const sessionId = req.headers.get("x-joplin-session") || undefined

    // Get existing note to see if we already have a joplinNoteId
    const existing = await getNotebookNote(idNum)
    let joplinNoteId = existing?.joplinNoteId || null

    try {
      const notebook = existing?.notebookId ? await getNotebook(existing.notebookId) : null
      const parentId = notebook?.joplinFolderId || undefined

      if (joplinNoteId) {
        await updateNote(joplinNoteId, content ?? "", title.trim(), parentId, sessionId)
      } else {
        const joplinNote = await createNote(title.trim(), content ?? "", parentId, sessionId)
        joplinNoteId = joplinNote.id
      }
    } catch (err) {
      console.error("Error syncing notebook note update to Joplin:", err)
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "No se pudo guardar la nota en Joplin." },
        { status: statusForError(err) },
      )
    }

    // Save empty content locally, leaving body only in Joplin
    await updateNotebookNote(idNum, title.trim(), "", joplinNoteId)
    return NextResponse.json({ ok: true, joplinNoteId })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const { noteId } = await params
    const idNum = Number(noteId)
    if (isNaN(idNum)) {
      return NextResponse.json({ error: "ID de nota inválido." }, { status: 400 })
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
