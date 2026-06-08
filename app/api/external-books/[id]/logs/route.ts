import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/mysql"
import { getSession } from "@/lib/auth"

export async function POST(
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
    const { title, pages_read, chapter, reflection } = await req.json()

    // Validar que el libro pertenezca al usuario
    const [books]: any = await getPool().query(
      `SELECT id FROM user_external_books WHERE id = ? AND user_id = ?`,
      [bookId, user.userId]
    )

    if (books.length === 0) {
      return NextResponse.json({ error: "Libro no encontrado" }, { status: 404 })
    }

    await getPool().query(
      `INSERT INTO user_external_book_logs (book_id, user_id, title, pages_read, chapter, reflection) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [bookId, user.userId, title || null, pages_read || null, chapter || null, reflection || null]
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    )
  }
}
