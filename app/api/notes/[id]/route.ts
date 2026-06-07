import { type NextRequest, NextResponse } from "next/server"
import { getNote, updateNote, VERSE_NOTES_FOLDER_ID } from "@/lib/joplin"
import { getNotebookNote, updateNotebookNote } from "@/lib/bible"

function statusForError(err: unknown): number {
  const message = err instanceof Error ? err.message.toLowerCase() : ""
  return message.includes("sesión") || message.includes("session") || message.includes("401") || message.includes("403")
    ? 401
    : 500
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (id.startsWith("local:")) {
      const localId = Number(id.replace("local:", ""))
      const note = await getNotebookNote(localId)
      if (!note) {
        return NextResponse.json({ error: "Nota local no encontrada" }, { status: 404 })
      }
      return NextResponse.json({
        note: {
          id,
          title: note.title,
          body: note.content,
        },
      })
    }
    const sessionId = req.headers.get("x-joplin-session") || undefined
    const note = await getNote(id, sessionId)
    return NextResponse.json({ note })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: statusForError(err) },
    )
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { body, title } = await req.json()
    if (id.startsWith("local:")) {
      const localId = Number(id.replace("local:", ""))
      const existing = await getNotebookNote(localId)
      if (!existing) {
        return NextResponse.json({ error: "Nota local no encontrada" }, { status: 404 })
      }
      await updateNotebookNote(localId, title ?? existing.title, body ?? "", existing.joplinNoteId ?? null)
      return NextResponse.json({
        note: {
          id,
          title: title ?? existing.title,
          body: body ?? "",
        },
      })
    }
    const sessionId = req.headers.get("x-joplin-session") || undefined
    const note = await updateNote(id, body ?? "", title, VERSE_NOTES_FOLDER_ID, sessionId)
    return NextResponse.json({ note })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: statusForError(err) },
    )
  }
}
