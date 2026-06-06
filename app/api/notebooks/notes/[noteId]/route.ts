import { type NextRequest, NextResponse } from "next/server"
import { getNotebookNote, updateNotebookNote, deleteNotebookNote } from "@/lib/bible"

export async function GET(
  _req: NextRequest,
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
    const { noteId } = await params
    const idNum = Number(noteId)
    if (isNaN(idNum)) {
      return NextResponse.json({ error: "ID de nota inválido." }, { status: 400 })
    }
    const { title, content } = await req.json()
    if (!title || !title.trim()) {
      return NextResponse.json({ error: "El título es obligatorio." }, { status: 400 })
    }
    await updateNotebookNote(idNum, title.trim(), content ?? "")
    return NextResponse.json({ ok: true })
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
