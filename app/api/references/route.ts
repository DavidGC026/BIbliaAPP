import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/mysql"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    // Export en bloque para la descarga offline del móvil: filas compactas
    // [vid_origen, vid_destino, votos] paginadas (para mostrar progreso)
    // Agregación capítulo-a-capítulo para el diagrama de arcos (mapa de referencias)
    if (searchParams.get("arcs") !== null) {
      const [rows] = await getPool().query<{ a: number; b: number; n: number }[]>(
        `SELECT FLOOR(vid_origen / 1000) AS a, FLOOR(vid_destino / 1000) AS b, COUNT(*) AS n
         FROM bible_cross_references
         GROUP BY FLOOR(vid_origen / 1000), FLOOR(vid_destino / 1000)`,
      )
      const keySet = new Set<number>()
      for (const r of rows) {
        keySet.add(Number(r.a))
        keySet.add(Number(r.b))
      }
      const keys = [...keySet].sort((x, y) => x - y)
      const idx = new Map(keys.map((k, i) => [k, i]))
      const arcs: number[] = []
      for (const r of rows) {
        const a = Number(r.a)
        const b = Number(r.b)
        arcs.push(idx.get(a)!, idx.get(b)!, Number(r.n))
      }
      return NextResponse.json(
        { keys, arcs },
        { headers: { "Cache-Control": "public, max-age=86400" } },
      )
    }

    if (searchParams.get("export") !== null) {
      const page = Math.max(1, Number(searchParams.get("page")) || 1)
      const EXPORT_PAGE_SIZE = 25000
      const [countRows] = await getPool().query<any[]>(
        `SELECT COUNT(*) AS total FROM bible_cross_references`,
      )
      const total = Number(countRows[0]?.total ?? 0)
      const [rows] = await getPool().query<any[]>(
        `SELECT vid_origen, vid_destino, votos
         FROM bible_cross_references
         ORDER BY vid_origen, vid_destino
         LIMIT ? OFFSET ?`,
        [EXPORT_PAGE_SIZE, (page - 1) * EXPORT_PAGE_SIZE],
      )
      return NextResponse.json(
        {
          rows: rows.map((r) => [r.vid_origen, r.vid_destino, r.votos]),
          total,
          page,
          totalPages: Math.max(1, Math.ceil(total / EXPORT_PAGE_SIZE)),
        },
        { headers: { "Cache-Control": "public, max-age=86400" } },
      )
    }

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
