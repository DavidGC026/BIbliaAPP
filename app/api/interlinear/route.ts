import { type NextRequest, NextResponse } from "next/server"

import { findInterlinearCoverage, findInterlinearWords } from "@/lib/interlinear/query"

/**
 * Interlineal griego/hebreo para un pasaje.
 *
 *   /api/interlinear?book=43&chapter=1&verse=1   → palabras de un versículo
 *   /api/interlinear?book=40&chapter=1           → capítulo entero
 *   /api/interlinear?coverage=1                  → libros con datos
 *   /api/interlinear?coverage=1&book=43          → capítulos de un libro
 *   /api/interlinear?coverage=1&book=43&chapter=1 → versículos del capítulo
 *
 * Datos fijos, sin usuario: misma caché que el diccionario.
 */
const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: status === 200 ? CACHE_HEADERS : undefined })
}

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams
    const bookId = Number(params.get("book")) || undefined
    const chapter = Number(params.get("chapter")) || undefined
    const verseParam = params.get("verse")
    const verse = verseParam === null || verseParam === "" ? undefined : Number(verseParam)

    if (params.get("coverage") !== null) {
      return json(await findInterlinearCoverage({ bookId, chapter }))
    }

    if (!bookId || !chapter) {
      return json({ error: "Parámetros 'book' y 'chapter' requeridos." }, 400)
    }
    if (verse !== undefined && !Number.isFinite(verse)) {
      return json({ error: "El parámetro 'verse' no es válido." }, 400)
    }

    const words = await findInterlinearWords({ bookId, chapter, verse })
    return json({ words })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al consultar el interlineal" },
      { status: 500 },
    )
  }
}
