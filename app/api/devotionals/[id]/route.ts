import { type NextRequest, NextResponse } from "next/server"
import { updateDevotional, deleteDevotional } from "@/lib/bible"
import { getSession } from "@/lib/auth"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    const { id } = await params
    const devotionalId = parseInt(id, 10)
    if (isNaN(devotionalId)) {
      return NextResponse.json({ error: "ID de devocional inválido." }, { status: 400 })
    }

    const { title, emotion, verseRef, content } = await req.json()
    if (!title || !title.trim()) {
      return NextResponse.json({ error: "El título es obligatorio." }, { status: 400 })
    }

    await updateDevotional(devotionalId, session.userId, title.trim(), emotion, verseRef, content)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al actualizar devocional" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    const { id } = await params
    const devotionalId = parseInt(id, 10)
    if (isNaN(devotionalId)) {
      return NextResponse.json({ error: "ID de devocional inválido." }, { status: 400 })
    }

    await deleteDevotional(devotionalId, session.userId)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al eliminar devocional" },
      { status: 500 }
    )
  }
}
