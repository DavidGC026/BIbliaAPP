import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/mysql"
import { getSession } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const user = await getSession(req)
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const [rows] = await getPool().query<any[]>(
      `SELECT f.id, f.bible_id, f.book_id, b.name as book_name, f.chapter, f.verse, f.created_at, v.text as verse_text
       FROM bible_favorites f
       JOIN bible_books b ON f.book_id = b.idBook
       JOIN bible_verses v ON v.idBible = f.bible_id AND v.idBook = f.book_id AND v.chapter = f.chapter AND v.verse = f.verse
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [user.userId]
    )

    return NextResponse.json({ favorites: rows })
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

    const { bibleId, bookId, chapter, verse } = await req.json()
    if (!bibleId || !bookId || !chapter || !verse) return NextResponse.json({ error: "Faltan datos" }, { status: 400 })

    const [result] = await getPool().query<any>(
      "INSERT INTO bible_favorites (user_id, bible_id, book_id, chapter, verse) VALUES (?, ?, ?, ?, ?)",
      [user.userId, bibleId, bookId, chapter, verse]
    )

    return NextResponse.json({ id: result.insertId, success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSession(req)
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

    await getPool().query<any>(
      "DELETE FROM bible_favorites WHERE id = ? AND user_id = ?",
      [id, user.userId]
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    )
  }
}
