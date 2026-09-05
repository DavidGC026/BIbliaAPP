import { NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { listAccessibleBibles } from "@/lib/bible-access"
import { getPool } from "@/lib/mysql"
import { COMPLETION_PASSAGES } from "@/lib/games/content"
import type { GameVerse } from "@/lib/games/engine"

export async function GET(req: Request) {
  const parameter = new URL(req.url).searchParams.get("bible")
  const requested = parameter === null ? null : Number(parameter)
  if (requested !== null && (!Number.isSafeInteger(requested) || requested <= 0)) {
    return NextResponse.json({ error: "Selecciona una versión bíblica válida." }, { status: 400 })
  }
  try {
    const bibles = await listAccessibleBibles(req)
    const defaultId = Number(process.env.DEFAULT_PUBLIC_BIBLE_ID)
    const bible = requested === null
      ? bibles.find((candidate) => candidate.bibleId === defaultId) ?? bibles[0]
      : bibles.find((candidate) => candidate.bibleId === requested)
    if (!bible) return NextResponse.json({ error: "Esta versión bíblica no está disponible." }, { status: 404 })

    const passages = COMPLETION_PASSAGES.map(() => "(bv.idBook = ? AND bv.chapter = ? AND bv.verse = ?)").join(" OR ")
    const [verses] = await getPool().query<(RowDataPacket & GameVerse)[]>(
      `SELECT bv.idVerse AS id, bv.idBook AS bookId, bb.name AS bookName,
              bv.chapter, bv.verse, bv.text
       FROM bible_verses bv JOIN bible_books bb ON bb.idBook = bv.idBook
       WHERE bv.idBible = ? AND (${passages})
       ORDER BY bv.idBook, bv.chapter, bv.verse`,
      [bible.bibleId, ...COMPLETION_PASSAGES.flat()],
    )
    return NextResponse.json({ bible, verses }, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    console.error("Error cargando versículos para juegos:", error)
    return NextResponse.json({ error: "No se pudieron cargar los versículos. Intenta de nuevo." }, { status: 500 })
  }
}
