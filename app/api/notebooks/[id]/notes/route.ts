import { type NextRequest, NextResponse } from "next/server"
import { listNotebookNotes, createNotebookNote, getNotebook } from "@/lib/bible"
import { createNote, syncJoplin } from "@/lib/joplin"

function statusForError(err: unknown): number {
  const message = err instanceof Error ? err.message.toLowerCase() : ""
  return message.includes("sesión") || message.includes("session") || message.includes("401") || message.includes("403")
    ? 401
    : 500
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const idNum = Number(id)
    if (isNaN(idNum)) {
      return NextResponse.json({ error: "ID de libreta inválido." }, { status: 400 })
    }

    const sessionId = req.headers.get("x-joplin-session") || undefined
    try {
      await syncJoplin(sessionId)
    } catch (err) {
      console.error("Error syncing notes from Joplin:", err)
    }

    const notes = await listNotebookNotes(idNum)
    return NextResponse.json({ notes })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: statusForError(err) },
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const idNum = Number(id)
    if (isNaN(idNum)) {
      return NextResponse.json({ error: "ID de libreta inválido." }, { status: 400 })
    }
    const { title, content } = await req.json()
    if (!title || !title.trim()) {
      return NextResponse.json({ error: "El título es obligatorio." }, { status: 400 })
    }

    const sessionId = req.headers.get("x-joplin-session") || undefined
    let joplinNoteId: string | null = null

    try {
      // Fetch the notebook to get joplinFolderId
      const notebook = await getNotebook(idNum)
      const parentId = notebook?.joplinFolderId || undefined
      
      const joplinNote = await createNote(title.trim(), content ?? "", parentId, sessionId)
      joplinNoteId = joplinNote.id
    } catch (err) {
      console.error("Error creating note in Joplin:", err)
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "No se pudo crear la nota en Joplin." },
        { status: statusForError(err) },
      )
    }

    const noteId = await createNotebookNote(idNum, title.trim(), content ?? "", joplinNoteId)
    return NextResponse.json({
      id: noteId,
      title: title.trim(),
      content: content ?? "",
      joplinNoteId,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}
