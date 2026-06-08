import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/mysql"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const bibleId = Number(searchParams.get("bible")) || 1
    const bookId = Number(searchParams.get("bookId"))
    const chapter = Number(searchParams.get("chapter"))
    const verse = Number(searchParams.get("verse"))

    if (!bookId || !chapter || !verse) {
      return NextResponse.json({ error: "Parámetros 'bookId', 'chapter' y 'verse' requeridos." }, { status: 400 })
    }

    const vidOrigen = (bookId * 1000000) + (chapter * 1000) + verse;

    const query = `
      SELECT 
        b.name as book_name, 
        v.idBook as book_id,
        v.chapter, 
        v.verse, 
        v.text, 
        cr.votos
      FROM bible_cross_references cr
      JOIN bible_verses v ON v.idBook = FLOOR(cr.vid_destino / 1000000)
          AND v.chapter = FLOOR((cr.vid_destino MOD 1000000) / 1000)
          AND v.verse = cr.vid_destino MOD 1000
          AND v.idBible = ? 
      JOIN bible_books b ON b.idBook = v.idBook
      WHERE cr.vid_origen = ?
      ORDER BY cr.votos DESC
      LIMIT 100
    `

    const [rows] = await getPool().query<any[]>(query, [bibleId, vidOrigen])
    
    return NextResponse.json({ references: rows })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}
