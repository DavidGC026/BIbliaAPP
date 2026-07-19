import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/mysql"
import { getSession } from "@/lib/auth"
import { assertBibleAccess, bibleAccessStatus } from "@/lib/bible-access"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const bookId = Number(searchParams.get("book"))
    const chapter = Number(searchParams.get("chapter"))
    const bibleId = Number(searchParams.get("bibleId")) || 1 // Default to 1 if not provided

    if (isNaN(bookId) || isNaN(chapter)) {
      return NextResponse.json({ error: "Parámetros inválidos." }, { status: 400 })
    }

    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }
    await assertBibleAccess(req, bibleId)

    // Ensure database tables exist
    await getPool().query(`
      CREATE TABLE IF NOT EXISTS bible_verse_highlights (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL DEFAULT 0,
        book_id INT NOT NULL,
        chapter INT NOT NULL,
        verse INT NOT NULL,
        bible_id INT NOT NULL DEFAULT 1,
        color VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_verse_user_bible_highlight (user_id, book_id, chapter, verse, bible_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    const [rows] = await getPool().query(
      "SELECT verse, color FROM bible_verse_highlights WHERE user_id = ? AND book_id = ? AND chapter = ? AND bible_id = ?",
      [session.userId, bookId, chapter, bibleId]
    )

    return NextResponse.json({ highlights: rows })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: bibleAccessStatus(err) }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { bookId, chapter, verses, color, bibleId = 1 } = await req.json()

    if (!bookId || !chapter || !Array.isArray(verses) || verses.length === 0) {
      return NextResponse.json({ error: "Parámetros inválidos." }, { status: 400 })
    }

    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }
    await assertBibleAccess(req, Number(bibleId))

    // Ensure database tables exist
    await getPool().query(`
      CREATE TABLE IF NOT EXISTS bible_verse_highlights (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL DEFAULT 0,
        book_id INT NOT NULL,
        chapter INT NOT NULL,
        verse INT NOT NULL,
        bible_id INT NOT NULL DEFAULT 1,
        color VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_verse_user_highlight (user_id, book_id, chapter, verse, bible_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    if (!color) {
      // Delete highlights for specified verses
      await getPool().query(
        `DELETE FROM bible_verse_highlights WHERE user_id = ? AND book_id = ? AND chapter = ? AND bible_id = ? AND verse IN (${verses.map(() => "?").join(",")})`,
        [session.userId, bookId, chapter, bibleId, ...verses]
      )
    } else {
      // Upsert highlights
      for (const verse of verses) {
        await getPool().query(
          `INSERT INTO bible_verse_highlights (user_id, book_id, chapter, verse, color, bible_id)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE color = ?`,
          [session.userId, bookId, chapter, verse, color, bibleId, color]
        )
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: bibleAccessStatus(err) }
    )
  }
}
