import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/mysql"
import { getSession } from "@/lib/auth"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSession(req)
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const bookId = Number(id)

    // Obtener detalles del libro
    const [books]: any = await getPool().query(
      `SELECT * FROM user_external_books WHERE id = ? AND user_id = ?`,
      [bookId, user.userId]
    )

    if (books.length === 0) {
      return NextResponse.json({ error: "Libro no encontrado" }, { status: 404 })
    }

    // Obtener logs del libro
    const [logs]: any = await getPool().query(
      `SELECT * FROM user_external_book_logs WHERE book_id = ? AND user_id = ? ORDER BY created_at DESC`,
      [bookId, user.userId]
    )

    return NextResponse.json({ book: books[0], logs })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSession(req)
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const bookId = Number(id)

    await getPool().query(
      `DELETE FROM user_external_books WHERE id = ? AND user_id = ?`,
      [bookId, user.userId]
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    )
  }
}
