import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/mysql"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const bookId = Number(searchParams.get("book"))
    const chapter = Number(searchParams.get("chapter"))

    if (isNaN(bookId) || isNaN(chapter)) {
      return NextResponse.json({ error: "Parámetros inválidos." }, { status: 400 })
    }

    // Ensure database table exists before querying
    await getPool().query(`
      CREATE TABLE IF NOT EXISTS bible_verse_highlights (
        id INT AUTO_INCREMENT PRIMARY KEY,
        book_id INT NOT NULL,
        chapter INT NOT NULL,
        verse INT NOT NULL,
        color VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_verse_highlight (book_id, chapter, verse)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    const [rows] = await getPool().query(
      "SELECT verse, color FROM bible_verse_highlights WHERE book_id = ? AND chapter = ?",
      [bookId, chapter]
    )

    return NextResponse.json({ highlights: rows })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { bookId, chapter, verses, color } = await req.json()

    if (!bookId || !chapter || !Array.isArray(verses) || verses.length === 0) {
      return NextResponse.json({ error: "Parámetros inválidos." }, { status: 400 })
    }

    // Ensure database table exists
    await getPool().query(`
      CREATE TABLE IF NOT EXISTS bible_verse_highlights (
        id INT AUTO_INCREMENT PRIMARY KEY,
        book_id INT NOT NULL,
        chapter INT NOT NULL,
        verse INT NOT NULL,
        color VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_verse_highlight (book_id, chapter, verse)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    if (!color) {
      // Delete highlights for specified verses
      await getPool().query(
        `DELETE FROM bible_verse_highlights WHERE book_id = ? AND chapter = ? AND verse IN (${verses.map(() => "?").join(",")})`,
        [bookId, chapter, ...verses]
      )
    } else {
      // Upsert highlights
      for (const verse of verses) {
        await getPool().query(
          `INSERT INTO bible_verse_highlights (book_id, chapter, verse, color)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE color = ?`,
          [bookId, chapter, verse, color, color]
        )
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    )
  }
}
