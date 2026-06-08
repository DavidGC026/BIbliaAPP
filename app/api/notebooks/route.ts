import { type NextRequest, NextResponse } from "next/server"
import { listNotebooks, createNotebook } from "@/lib/bible"
import { getSession } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    const notebooks = await listNotebooks(session.userId)
    return NextResponse.json({ notebooks })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al obtener libretas" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    const { name } = await req.json()
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 })
    }

    const id = await createNotebook(name.trim(), session.userId)
    return NextResponse.json({ id, name: name.trim() })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al crear libreta" },
      { status: 500 }
    )
  }
}
