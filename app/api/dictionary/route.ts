import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/mysql"
import type { RowDataPacket } from "mysql2/promise"

const PAGE_SIZE = 25
const MIN_QUERY_LENGTH = 2
// Los datos de diccionarios casi no cambian: cachear 1h en CDN/navegador
const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: status === 200 ? CACHE_HEADERS : undefined })
}

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams
    const pool = getPool()

    // Listado de diccionarios disponibles (para el selector de la UI)
    if (params.get("list") !== null) {
      const [dicts] = await pool.query<RowDataPacket[]>(
        `SELECT d.slug, d.name, d.language, COUNT(e.id) AS entryCount
         FROM bible_dictionaries d
         LEFT JOIN bible_dictionary_entries e ON e.dictionary_id = d.id
         GROUP BY d.id ORDER BY d.id`,
      )
      return json({ dictionaries: dicts })
    }

    const dict = (params.get("dict") || "strong").trim()
    const q = (params.get("q") || "").trim()
    const lang = params.get("lang") || "all" // all | greek | hebrew
    const page = Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1)
    const code = (params.get("code") || "").trim()
    const browse = params.get("browse") !== null

    // Definición en español cuando existe, con fallback al inglés
    const definitionSelect = `COALESCE(NULLIF(e.definition_es, ''), e.definition) AS definition`

    // Búsqueda directa por código (G25, H430...)
    if (code) {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT e.code AS strongCode, e.lemma, e.transliteration, ${definitionSelect}
         FROM bible_dictionary_entries e
         JOIN bible_dictionaries d ON d.id = e.dictionary_id
         WHERE d.slug = ? AND e.code = ?`,
        [dict, code.toUpperCase()],
      )
      return json({ entry: rows[0] ?? null })
    }

    const isCodeQuery = /^[gh]\d+$/i.test(q)

    // Sin búsqueda válida y sin modo exploración: no devolver el catálogo entero
    if (!browse && !isCodeQuery && q.length < MIN_QUERY_LENGTH) {
      return json({
        entries: [],
        total: 0,
        page: 1,
        pageSize: PAGE_SIZE,
        totalPages: 1,
        minQueryLength: MIN_QUERY_LENGTH,
      })
    }

    const where: string[] = [`d.slug = ?`]
    const values: (string | number)[] = [dict]

    if (lang === "greek") where.push(`e.code LIKE 'G%'`)
    else if (lang === "hebrew") where.push(`e.code LIKE 'H%'`)

    let relevanceSelect = ""
    let relevanceOrder = ""
    const relevanceValues: string[] = []

    if (q) {
      if (isCodeQuery) {
        where.push(`e.code = ?`)
        values.push(q.toUpperCase())
      } else {
        // FULLTEXT para relevancia + LIKE para coincidencias parciales (lema/transliteración)
        // definition_es permite buscar también en español
        const booleanQuery = q
          .split(/\s+/)
          .filter(Boolean)
          .map((word) => `${word}*`)
          .join(" ")
        where.push(
          `(MATCH(e.lemma, e.transliteration, e.definition) AGAINST (? IN BOOLEAN MODE)
            OR e.definition_es LIKE ? OR e.lemma LIKE ? OR e.transliteration LIKE ? OR e.code LIKE ?)`,
        )
        values.push(booleanQuery, `%${q}%`, `%${q}%`, `%${q}%`, `${q.toUpperCase()}%`)

        relevanceSelect = `, MATCH(e.lemma, e.transliteration, e.definition) AGAINST (?) AS relevance`
        relevanceOrder = `relevance DESC, `
        relevanceValues.push(q)
      }
    }

    const whereSQL = `WHERE ${where.join(" AND ")}`

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM bible_dictionary_entries e
       JOIN bible_dictionaries d ON d.id = e.dictionary_id
       ${whereSQL}`,
      values,
    )
    const total = Number(countRows[0]?.total ?? 0)

    const offset = (page - 1) * PAGE_SIZE
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT e.code AS strongCode, e.lemma, e.transliteration, ${definitionSelect}${relevanceSelect}
       FROM bible_dictionary_entries e
       JOIN bible_dictionaries d ON d.id = e.dictionary_id
       ${whereSQL}
       ORDER BY ${relevanceOrder}CAST(SUBSTRING(e.code, 2) AS UNSIGNED), e.code
       LIMIT ? OFFSET ?`,
      [...relevanceValues, ...values, PAGE_SIZE, offset],
    )

    return json({
      entries: rows.map(({ relevance: _relevance, ...entry }) => entry),
      total,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al consultar el diccionario" },
      { status: 500 },
    )
  }
}
