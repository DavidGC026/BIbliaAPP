import { type NextRequest, NextResponse } from "next/server"
import { deleteNotebook, getNotebook, updateNotebook } from "@/lib/bible"
import { getSession } from "@/lib/auth"

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    const { id } = await params
    const idNum = Number(id)
    if (isNaN(idNum)) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 })
    }

    const notebook = await getNotebook(idNum, session.userId)
    if (!notebook) {
      return NextResponse.json({ error: "Libreta no encontrada." }, { status: 404 })
    }

    await deleteNotebook(idNum, session.userId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    const { id } = await params
    const idNum = Number(id)
    if (isNaN(idNum)) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 })
    }

    const { name, coverImage } = await req.json()
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 })
    }

    const notebook = await getNotebook(idNum, session.userId)
    if (!notebook) {
      return NextResponse.json({ error: "Libreta no encontrada." }, { status: 404 })
    }

    await updateNotebook(idNum, name.trim(), coverImage || null, session.userId)
    return NextResponse.json({ ok: true, name: name.trim(), coverImage })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}
