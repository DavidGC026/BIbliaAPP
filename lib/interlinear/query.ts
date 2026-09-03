import type { RowDataPacket } from "mysql2/promise"

import { getPool } from "../mysql"
import { ensureInterlinearTables } from "./tables"

export interface InterlinearWordView {
  bookId: number
  chapter: number
  verse: number
  position: number
  original: string
  transliteration: string | null
  strongCode: string | null
  morph: string | null
  lemma: string | null
  glossEs: string | null
  glossEn: string | null
  language: "grc" | "heb" | "arc"
  definition: string | null
}

export interface InterlinearCoverageBook {
  bookId: number
  chapters: number
  words: number
}

export interface InterlinearCoverageChapter {
  chapter: number
  verses: number
  words: number
}

interface WordRow extends RowDataPacket {
  bookId: number
  chapter: number
  verse: number
  position: number
  original: string
  transliteration: string | null
  strongCode: string | null
  morph: string | null
  lemma: string | null
  glossEs: string | null
  glossEn: string | null
  language: "grc" | "heb" | "arc"
  definition: string | null
}

const WORD_SELECT = `
  i.idBook AS bookId, i.chapter, i.verse, i.position, i.original,
  i.transliteration, i.strong_code AS strongCode, i.morph, i.lemma,
  i.gloss_es AS glossEs, i.gloss_en AS glossEn, i.language,
  COALESCE(NULLIF(e.definition_es, ''), e.definition, p.description_es, p.gloss_es) AS definition
`

const WORD_FROM = `
  FROM bible_interlinear i
  LEFT JOIN bible_dictionaries d ON d.slug = 'strong'
  LEFT JOIN bible_dictionary_entries e ON e.dictionary_id = d.id AND e.code = i.strong_code
  LEFT JOIN bible_strong_particles p ON p.strong_code = i.strong_code
`

export async function findInterlinearWords(query: {
  bookId: number
  chapter: number
  verse?: number
}): Promise<InterlinearWordView[]> {
  await ensureInterlinearTables()

  const where = ["i.idBook = ?", "i.chapter = ?"]
  const values: number[] = [query.bookId, query.chapter]
  if (query.verse !== undefined) {
    where.push("i.verse = ?")
    values.push(query.verse)
  }

  const [rows] = await getPool().query<WordRow[]>(
    `SELECT ${WORD_SELECT}
     ${WORD_FROM}
     WHERE ${where.join(" AND ")}
     ORDER BY i.verse, i.position`,
    values,
  )
  return rows.map((row) => ({
    bookId: Number(row.bookId),
    chapter: Number(row.chapter),
    verse: Number(row.verse),
    position: Number(row.position),
    original: row.original,
    transliteration: row.transliteration,
    strongCode: row.strongCode,
    morph: row.morph,
    lemma: row.lemma,
    glossEs: row.glossEs,
    glossEn: row.glossEn,
    language: row.language,
    definition: row.definition,
  }))
}

export async function findInterlinearCoverage(query?: {
  bookId?: number
  chapter?: number
}): Promise<
  | { verses: number[] }
  | { bookId: number; chapters: InterlinearCoverageChapter[] }
  | { books: InterlinearCoverageBook[] }
> {
  await ensureInterlinearTables()
  const pool = getPool()

  if (query?.bookId && query.chapter) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT DISTINCT verse
       FROM bible_interlinear
       WHERE idBook = ? AND chapter = ?
       ORDER BY verse`,
      [query.bookId, query.chapter],
    )
    return { verses: rows.map((row) => Number(row.verse)) }
  }

  if (query?.bookId) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT chapter, COUNT(DISTINCT verse) AS verses, COUNT(*) AS words
       FROM bible_interlinear
       WHERE idBook = ?
       GROUP BY chapter
       ORDER BY chapter`,
      [query.bookId],
    )
    return {
      bookId: query.bookId,
      chapters: rows.map((row) => ({
        chapter: Number(row.chapter),
        verses: Number(row.verses),
        words: Number(row.words),
      })),
    }
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT idBook AS bookId, COUNT(DISTINCT chapter) AS chapters, COUNT(*) AS words
     FROM bible_interlinear
     GROUP BY idBook
     ORDER BY idBook`,
  )
  return {
    books: rows.map((row) => ({
      bookId: Number(row.bookId),
      chapters: Number(row.chapters),
      words: Number(row.words),
    })),
  }
}
