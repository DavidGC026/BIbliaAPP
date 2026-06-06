import { type NextRequest, NextResponse } from "next/server"
import { appendToNote } from "@/lib/joplin"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { block } = await req.json()
    if (!block || typeof block !== "string") {
      return NextResponse.json({ error: "No hay contenido para añadir." }, { status: 400 })
    }
    const note = await appendToNote(id, block)
    return NextResponse.json({ note })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error desconocido" }, { status: 500 })
  }
}
