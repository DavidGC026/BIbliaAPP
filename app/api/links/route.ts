import { type NextRequest, NextResponse } from "next/server"
import {
  getLinksForChapter,
  createLink,
  deleteLink,
} from "@/lib/bible"
import { createNote, ensureVerseNotesFolder, VERSE_NOTES_FOLDER_ID } from "@/lib/joplin"

function isJoplinAuthError(message: string): boolean {
  return (
    message.includes("(401)") ||
    message.includes("(403)") ||
    message.toLowerCase().includes("session") ||
    message.toLowerCase().includes("sesión") ||
    message.toLowerCase().includes("credenciales") ||
    message.toLowerCase().includes("inicia sesión")
  )
}

async function createJoplinVerseNote(title: string, body: string, sessionId?: string): Promise<string> {
  await ensureVerseNotesFolder(sessionId)
  const note = await createNote(title, body, VERSE_NOTES_FOLDER_ID, sessionId)
  return note.id
}

// GET /api/links?book=&chapter=  -> existing links for a chapter
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const bookId = Number(searchParams.get("book"))
    const chapter = Number(searchParams.get("chapter"))
    if (!bookId || !chapter) {
      return NextResponse.json({ error: "Parámetros 'book' y 'chapter' requeridos." }, { status: 400 })
    }
    const links = await getLinksForChapter(bookId, chapter)
    return NextResponse.json({ links })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}

// POST /api/links  -> create a Joplin note for a verse and link it
// body: { bookId, bookName, chapter, verse, text, existingNoteId? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { bookId, bookName, chapter, verse, text, existingNoteId } = body

    if (!bookId || !chapter || !verse) {
      return NextResponse.json({ error: "Datos del versículo incompletos." }, { status: 400 })
    }

    const sessionId = req.headers.get("x-joplin-session") || undefined
    let noteId = existingNoteId as string | undefined
    if (!noteId) {
      const title = `${bookName} ${chapter}:${verse}`
      const noteBody = `> ${text ?? ""}\n\n*(${title} — RVR1960)*\n\n`
      noteId = await createJoplinVerseNote(title, noteBody, sessionId)
    }

    await createLink(bookId, chapter, verse, noteId!)
    return NextResponse.json({ joplinNoteId: noteId })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    if (isJoplinAuthError(message)) {
      return NextResponse.json(
        { error: "La sesión de Joplin no es válida. Inicia sesión con tus credenciales de Joplin e intenta nuevamente." },
        { status: 401 },
      )
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/links?id=  -> remove a link (does not delete the Joplin note)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get("id"))
    if (!id) return NextResponse.json({ error: "Parámetro 'id' requerido." }, { status: 400 })
    await deleteLink(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}
