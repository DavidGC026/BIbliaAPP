import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/mysql"
import { getSession } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    // Join with bible_verses and bible_books
    // Assuming bible_verses contains: idVerse, idBook, chapter, verse, text, idBible
    // And bible_books contains: idBook, name
    // Assuming the user is reading bible id 149 (RVR1960 default) or we can just pick the first matching bible text.
    // To simplify, we just join with any bible verse that matches book, chapter, verse.
    
    // We need to ensure the highlights table has been created to avoid errors
    await getPool().query(`
      CREATE TABLE IF NOT EXISTS bible_verse_highlights (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL DEFAULT 0,
        book_id INT NOT NULL,
        chapter INT NOT NULL,
        verse INT NOT NULL,
        color VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_verse_user_highlight (user_id, book_id, chapter, verse)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    const [rows] = await getPool().query(`
      SELECT 
        h.id, h.book_id, h.chapter, h.verse, h.color, h.created_at,
        bb.name AS book_name,
        (SELECT bv.text FROM bible_verses bv WHERE bv.idBook = h.book_id AND bv.chapter = h.chapter AND bv.verse = h.verse LIMIT 1) as text
      FROM bible_verse_highlights h
      JOIN bible_books bb ON h.book_id = bb.idBook
      WHERE h.user_id = ?
      ORDER BY h.created_at DESC
    `, [session.userId])

    return NextResponse.json({ highlights: rows })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    )
  }
}
