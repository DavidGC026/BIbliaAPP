import { type NextRequest, NextResponse } from "next/server"
import { getLinksForChapter, createLink, deleteLink } from "@/lib/bible"
import { createNote, ensureDefaultFolder, BIBLIA_FOLDER_ID } from "@/lib/joplin"

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

    const joplinToken = req.headers.get("x-joplin-token") || undefined
    let noteId = existingNoteId as string | undefined
    if (!noteId) {
      if (joplinToken) {
        await ensureDefaultFolder(joplinToken)
      }
      const title = `${bookName} ${chapter}:${verse}`
      const noteBody = `> ${text ?? ""}\n\n*(${title} — RVR1960)*\n\n`
      const note = await createNote(title, noteBody, BIBLIA_FOLDER_ID, joplinToken)
      noteId = note.id
    }

    await createLink(bookId, chapter, verse, noteId!)
    return NextResponse.json({ joplinNoteId: noteId })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
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
