import { type NextRequest, NextResponse } from "next/server"
import { getNote, updateNote } from "@/lib/joplin"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const joplinToken = req.headers.get("x-joplin-token") || undefined
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
    const joplinToken = req.headers.get("x-joplin-token") || undefined
    const note = await updateNote(id, body ?? "", title, joplinToken)
    return NextResponse.json({ note })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}
