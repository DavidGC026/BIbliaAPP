import { NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { listAccessibleBibles } from "@/lib/bible-access"
import { getPool } from "@/lib/mysql"
import { GameContentError, getDailyChallenge, getGameContent } from "@/lib/game-content-store"
import { parseCoordinates, passageKey } from "@/lib/games/catalog"
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

    const params = new URL(req.url).searchParams
    const daily = params.get("daily")
    let references = [...(daily ? (await getDailyChallenge(daily)).passages : (await getGameContent()).catalog.passages)]
    const restored = params.get("references")
    if (restored && !daily) {
      try {
        const entries = restored.split(",")
        if (!entries.length || entries.length > 500) throw new Error("Demasiados pasajes")
        references = entries.map(entry => {
          if (!/^\d+:\d+:\d+$/.test(entry)) throw new Error("Referencia inválida")
          const [bookId, chapter, verse] = entry.split(":").map(Number)
          return parseCoordinates({ bookId, chapter, verse })
        })
      } catch { return NextResponse.json({ error: "Los pasajes de la partida guardada no son válidos." }, { status: 400 }) }
    }
    if (params.has("passage")) {
      const parts = params.get("passage")!.split(":")
      if (parts.length !== 3) return NextResponse.json({ error: "La referencia no es válida." }, { status: 400 })
      try {
        const [bookId, chapter, verse] = parts.map(Number)
        references.push(parseCoordinates({ bookId, chapter, verse }))
      } catch { return NextResponse.json({ error: "La referencia no es válida." }, { status: 400 }) }
    }
    const unique = [...new Map(references.map(passage => [passageKey(passage), passage])).values()]
    const passages = unique.map(() => "(bv.idBook = ? AND bv.chapter = ? AND bv.verse = ?)").join(" OR ")
    const [verses] = await getPool().query<(RowDataPacket & GameVerse)[]>(
      `SELECT bv.idVerse AS id, bv.idBook AS bookId, bb.name AS bookName,
              bv.chapter, bv.verse, bv.text
       FROM bible_verses bv JOIN bible_books bb ON bb.idBook = bv.idBook
       WHERE bv.idBible = ? AND (${passages})
       ORDER BY bv.idBook, bv.chapter, bv.verse`,
      [bible.bibleId, ...unique.flatMap(passage => [passage.bookId, passage.chapter, passage.verse])],
    )
    if (restored && !daily && verses.length !== unique.length) return NextResponse.json({ error: "Uno de los pasajes guardados ya no está disponible en esta versión." }, { status: 404 })
    return NextResponse.json({ bible, verses }, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    if (error instanceof GameContentError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("Error cargando versículos para juegos:", error)
    return NextResponse.json({ error: "No se pudieron cargar los versículos. Intenta de nuevo." }, { status: 500 })
  }
}
