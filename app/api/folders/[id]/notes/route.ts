import { type NextRequest, NextResponse } from "next/server"
import { listNotesInFolder, createNote } from "@/lib/joplin"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const notes = await listNotesInFolder(id)
    return NextResponse.json({ notes })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error desconocido" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { title, body } = await req.json()
    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "El título de la nota es obligatorio." }, { status: 400 })
    }
    const note = await createNote(title, body ?? "", id)
    return NextResponse.json({ note })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error desconocido" }, { status: 500 })
  }
}
