import { type NextRequest, NextResponse } from "next/server"
import { getNote, updateNote } from "@/lib/joplin"
import { getNotebookNote, updateNotebookNote } from "@/lib/bible"

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
    const joplinToken = req.headers.get("x-joplin-token") || process.env.JOPLIN_TOKEN || undefined
    const note = await getNote(id, joplinToken)
    return NextResponse.json({ note })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
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
    const joplinToken = req.headers.get("x-joplin-token") || undefined
    const note = await updateNote(id, body ?? "", title, undefined, joplinToken)
    return NextResponse.json({ note })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}
