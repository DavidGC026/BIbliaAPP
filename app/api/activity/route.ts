import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/mysql"
import { getSession } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const user = await getSession(req)
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    // We fetch two things: the heatmap data (last 365 days) and the book progress
    const [heatmapRows] = await getPool().query<any[]>(
      `SELECT date, SUM(chapters_count) as total_chapters 
       FROM bible_reading_activity 
       WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)
       GROUP BY date 
       ORDER BY date ASC`,
      [user.userId]
    )

    const [progressRows] = await getPool().query<any[]>(
      `SELECT a.book_id, b.name as book_name, SUM(a.chapters_count) as total_chapters
       FROM bible_reading_activity a
       JOIN bible_books b ON a.book_id = b.idBook
       WHERE a.user_id = ?
       GROUP BY a.book_id
       ORDER BY MAX(a.date) DESC
       LIMIT 10`,
      [user.userId]
    )

    return NextResponse.json({ heatmap: heatmapRows, recentProgress: progressRows })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession(req)
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { bookId, chaptersCount = 1, versesCount = 0 } = await req.json()
    if (!bookId) return NextResponse.json({ error: "Libro requerido" }, { status: 400 })

    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    await getPool().query<any>(
      `INSERT INTO bible_reading_activity (user_id, date, book_id, chapters_count, verses_count)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         chapters_count = chapters_count + VALUES(chapters_count),
         verses_count = verses_count + VALUES(verses_count)`,
      [user.userId, today, bookId, chaptersCount, versesCount]
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    )
  }
}
