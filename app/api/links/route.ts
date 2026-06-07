import { type NextRequest, NextResponse } from "next/server"
import {
  getLinksForChapter,
  createLink,
  deleteLink,
  listNotebooks,
  createNotebook,
  createNotebookNote,
} from "@/lib/bible"
import { createNote, BIBLIA_FOLDER_ID } from "@/lib/joplin"

async function createLocalVerseNote(title: string, body: string): Promise<string> {
  const notebooks = await listNotebooks()
  const existing = notebooks.find((n) => n.name === "Notas de versículo")
  const notebookId = existing?.id ?? await createNotebook("Notas de versículo")
  const localId = await createNotebookNote(notebookId, title, body)
  return `local:${localId}`
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

    const joplinToken = req.headers.get("x-joplin-token") || process.env.JOPLIN_TOKEN || undefined
    if (!joplinToken) {
      return NextResponse.json(
        { error: "Debes iniciar sesión en Joplin para crear notas por versículo." },
        { status: 401 },
      )
    }
    let noteId = existingNoteId as string | undefined
    if (!noteId) {
      const title = `${bookName} ${chapter}:${verse}`
      const noteBody = `> ${text ?? ""}\n\n*(${title} — RVR1960)*\n\n`
      try {
        const note = await createNote(title, noteBody, BIBLIA_FOLDER_ID, joplinToken)
        noteId = note.id
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error desconocido"
        if (message.includes("(401)") || message.includes("(403)") || message.toLowerCase().includes("session")) {
          noteId = await createLocalVerseNote(title, noteBody)
        } else {
          throw err
        }
      }
    }

    await createLink(bookId, chapter, verse, noteId!)
    return NextResponse.json({ joplinNoteId: noteId })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    if (message.includes("(401)") || message.includes("(403)") || message.toLowerCase().includes("token")) {
      return NextResponse.json(
        { error: "La sesión de Joplin del servidor expiró o no es válida. Actualiza JOPLIN_TOKEN e intenta nuevamente." },
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
