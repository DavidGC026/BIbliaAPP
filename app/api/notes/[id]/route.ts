import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/mysql"
import { getSession } from "@/lib/auth"
import { RowDataPacket } from "mysql2"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const idNum = Number(id)
    if (isNaN(idNum)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT id, book_id AS bookId, chapter, verse, note_content AS noteContent
       FROM bible_note_links
       WHERE id = ? AND user_id = ?`,
      [idNum, session.userId]
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: "Nota no encontrada" }, { status: 404 })
    }

    const row = rows[0]
    return NextResponse.json({
      note: {
        id: String(row.id),
        title: `Comentario de Versículo`,
        body: row.noteContent || "",
      }
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const idNum = Number(id)
    if (isNaN(idNum)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const { body } = await req.json()

    await getPool().query(
      `UPDATE bible_note_links SET note_content = ? WHERE id = ? AND user_id = ?`,
      [body || "", idNum, session.userId]
    )

    return NextResponse.json({
      note: {
        id,
        body: body || "",
      }
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}
