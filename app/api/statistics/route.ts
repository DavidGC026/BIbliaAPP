import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/mysql"
import { getSession } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const user = await getSession(req)
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    // Agrupar capítulos leídos por libro
    const [rows] = await getPool().query<any[]>(
      `SELECT a.book_id, b.name as book_name, SUM(a.chapters_count) as total_chapters
       FROM bible_reading_activity a
       JOIN bible_books b ON a.book_id = b.idBook
       WHERE a.user_id = ?
       GROUP BY a.book_id
       ORDER BY a.book_id ASC`,
      [user.userId]
    )

    return NextResponse.json({ statistics: rows })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    )
  }
}
