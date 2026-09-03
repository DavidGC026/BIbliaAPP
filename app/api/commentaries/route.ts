import { type NextRequest, NextResponse } from "next/server"

import { bibleAccessStatus } from "@/lib/bible-access"
import {
  DEFAULT_COMMENTARY_LANGUAGE,
  findCommentaries,
  findNearestCommentaries,
  listCommentaryAuthors,
} from "@/lib/commentaries"

/**
 * Comentarios bíblicos de dominio público para un pasaje.
 *
 *   /api/commentaries?book=1&chapter=1&verse=3      → los que cubren el versículo
 *   /api/commentaries?book=1&chapter=1              → el capítulo entero
 *   /api/commentaries?...&author=Matthew%20Henry    → un solo autor
 *   /api/commentaries?...&nearest=1                 → si nadie comentó ese
 *                                                     versículo, el bloque más
 *                                                     cercano del capítulo
 *   /api/commentaries?list=1                        → autores disponibles
 *
 * El lector pide el capítulo completo una sola vez y reparte los comentarios
 * entre sus versículos; el modo `verse` existe para consultas sueltas (móvil,
 * escritorio, enlaces directos).
 *
 * Son textos fijos y sin datos de usuario: se cachean como el diccionario.
 */
const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
}

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams
    const language = (params.get("lang") || DEFAULT_COMMENTARY_LANGUAGE).trim()

    if (params.get("list") !== null) {
      const authors = await listCommentaryAuthors(params.get("lang") ? language : undefined)
      return NextResponse.json({ authors }, { headers: CACHE_HEADERS })
    }

    const bookId = Number(params.get("book"))
    const chapter = Number(params.get("chapter"))
    if (!bookId || !chapter) {
      return NextResponse.json(
        { error: "Parámetros 'book' y 'chapter' requeridos." },
        { status: 400 },
      )
    }

    const verse = Number(params.get("verse")) || undefined
    const query = {
      bookId,
      chapter,
      verse,
      bibleId: Number(params.get("bible")) || undefined,
      languageCode: language,
      author: params.get("author")?.trim() || undefined,
    }

    const commentaries = await findCommentaries(query)

    // El respaldo solo tiene sentido preguntando por un versículo concreto y
    // cuando de verdad no hay nada que lo cubra.
    if (commentaries.length === 0 && verse && params.get("nearest") !== null) {
      const nearest = await findNearestCommentaries(query)
      return NextResponse.json({ commentaries: nearest, nearest: true }, { headers: CACHE_HEADERS })
    }

    return NextResponse.json({ commentaries, nearest: false }, { headers: CACHE_HEADERS })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al consultar los comentarios" },
      { status: bibleAccessStatus(err) },
    )
  }
}
