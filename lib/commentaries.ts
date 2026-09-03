import type { RowDataPacket, ResultSetHeader } from "mysql2/promise"

import { getPool } from "@/lib/mysql"
import { runOnce } from "@/lib/once-async"

/**
 * Comentarios bíblicos de dominio público (Matthew Henry, Charles Spurgeon…).
 *
 * Un comentario cubre un rango de versículos, no un versículo suelto: los
 * comentaristas clásicos escriben sobre bloques ("Génesis 1:1-5"). Buscar «el
 * comentario del versículo N» es por tanto buscar los rangos que lo contienen.
 *
 * Esquema en scripts/003_commentaries.sql.
 */

/** «Todas las versiones»: un comentario no suele depender de la traducción. */
export const ANY_BIBLE_ID = 0

export const DEFAULT_COMMENTARY_LANGUAGE = "es"

export interface Commentary {
  id: number
  bibleId: number
  bookId: number
  chapter: number
  verseStart: number
  verseEnd: number
  author: string
  languageCode: string
  contentMd: string
}

export interface CommentaryAuthor {
  author: string
  languageCode: string
  total: number
}

/** Fila lista para importar; `bibleId` y `languageCode` tienen valor por defecto. */
export interface CommentaryInput {
  bibleId?: number
  bookId: number
  chapter: number
  verseStart: number
  verseEnd: number
  author: string
  languageCode?: string
  contentMd: string
}

interface CommentaryRow extends RowDataPacket {
  id: number
  bibleId: number
  bookId: number
  chapter: number
  verseStart: number
  verseEnd: number
  author: string
  languageCode: string
  contentMd: string
}

interface AuthorRow extends RowDataPacket {
  author: string
  languageCode: string
  total: number
}

const SELECT_COLUMNS = `id, bible_id AS bibleId, book_id AS bookId, chapter,
         verse_start AS verseStart, verse_end AS verseEnd, author,
         language_code AS languageCode, content_md AS contentMd`

/**
 * Crea la tabla si falta. Igual que `ensureDbTables()`, se ejecuta una sola vez
 * por proceso: las rutas la llaman sin coste a partir de la segunda petición.
 */
export async function ensureCommentaryTables(): Promise<void> {
  return runOnce("ensureCommentaryTables", _ensureCommentaryTables)
}

async function _ensureCommentaryTables(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS bible_commentaries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      bible_id INT NOT NULL DEFAULT 0,
      book_id INT NOT NULL,
      chapter INT NOT NULL,
      verse_start INT NOT NULL,
      verse_end INT NOT NULL,
      author VARCHAR(120) NOT NULL,
      language_code VARCHAR(10) NOT NULL DEFAULT 'es',
      content_md MEDIUMTEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_commentary_lookup (book_id, chapter, language_code, verse_start, verse_end),
      UNIQUE KEY uniq_commentary_passage (
        bible_id, book_id, chapter, verse_start, verse_end, author, language_code
      )
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
}

export interface CommentaryQuery {
  bookId: number
  chapter: number
  /** Sin versículo se devuelve el capítulo entero (una petición por capítulo). */
  verse?: number
  /** Solo comentarios genéricos (0) y los de esta versión concreta. */
  bibleId?: number
  languageCode?: string
  author?: string
}

/**
 * Comentarios que **cubren** el versículo pedido, o todos los del capítulo si no
 * se indica versículo. Vacío si nadie comentó ese pasaje: para eso está
 * `findNearestCommentaries`.
 */
export async function findCommentaries(query: CommentaryQuery): Promise<Commentary[]> {
  await ensureCommentaryTables()

  const where = ["book_id = ?", "chapter = ?"]
  const values: (string | number)[] = [query.bookId, query.chapter]

  // El comentario genérico (bible_id = 0) sirve para cualquier traducción; el
  // atado a una versión concreta solo aparece al leer esa versión.
  if (query.bibleId) {
    where.push("(bible_id = ? OR bible_id = ?)")
    values.push(ANY_BIBLE_ID, query.bibleId)
  } else {
    where.push("bible_id = ?")
    values.push(ANY_BIBLE_ID)
  }

  where.push("language_code = ?")
  values.push(query.languageCode || DEFAULT_COMMENTARY_LANGUAGE)

  if (query.author) {
    where.push("author = ?")
    values.push(query.author)
  }

  if (query.verse) {
    where.push("verse_start <= ? AND verse_end >= ?")
    values.push(query.verse, query.verse)
  }

  const [rows] = await getPool().query<CommentaryRow[]>(
    `SELECT ${SELECT_COLUMNS}
     FROM bible_commentaries
     WHERE ${where.join(" AND ")}
     ORDER BY verse_start, verse_end, author`,
    values,
  )
  return rows.map(toCommentary)
}

/**
 * Rango comentado más cercano dentro del mismo capítulo, uno por autor.
 *
 * Sirve de respaldo cuando nadie comentó el versículo exacto: en Matthew Henry
 * un capítulo se cubre por bloques y casi siempre hay un bloque contiguo que da
 * contexto útil. La distancia es 0 para un rango que lo contiene, y si no, los
 * versículos que faltan para alcanzarlo.
 */
export async function findNearestCommentaries(query: CommentaryQuery): Promise<Commentary[]> {
  await ensureCommentaryTables()
  if (!query.verse) return []

  const where = ["book_id = ?", "chapter = ?"]
  const values: (string | number)[] = [query.bookId, query.chapter]

  if (query.bibleId) {
    where.push("(bible_id = ? OR bible_id = ?)")
    values.push(ANY_BIBLE_ID, query.bibleId)
  } else {
    where.push("bible_id = ?")
    values.push(ANY_BIBLE_ID)
  }

  where.push("language_code = ?")
  values.push(query.languageCode || DEFAULT_COMMENTARY_LANGUAGE)

  if (query.author) {
    where.push("author = ?")
    values.push(query.author)
  }

  // GREATEST(...) da 0 dentro del rango y la distancia al borde fuera de él.
  const distance = `GREATEST(verse_start - ?, ? - verse_end, 0)`

  const [rows] = await getPool().query<CommentaryRow[]>(
    `SELECT ${SELECT_COLUMNS}, ${distance} AS distance
     FROM bible_commentaries
     WHERE ${where.join(" AND ")}
     ORDER BY distance ASC, verse_start ASC
     LIMIT 40`,
    [query.verse, query.verse, ...values],
  )

  // Un solo comentario (el más cercano) por autor: dos bloques contiguos del
  // mismo autor no aportan nada y llenarían la ficha de ruido.
  const nearestByAuthor = new Map<string, Commentary>()
  for (const row of rows) {
    if (!nearestByAuthor.has(row.author)) nearestByAuthor.set(row.author, toCommentary(row))
  }
  return [...nearestByAuthor.values()]
}

/** Autores disponibles, para el selector de la interfaz. */
export async function listCommentaryAuthors(languageCode?: string): Promise<CommentaryAuthor[]> {
  await ensureCommentaryTables()
  const [rows] = await getPool().query<AuthorRow[]>(
    `SELECT author, language_code AS languageCode, COUNT(*) AS total
     FROM bible_commentaries
     ${languageCode ? "WHERE language_code = ?" : ""}
     GROUP BY author, language_code
     ORDER BY author`,
    languageCode ? [languageCode] : [],
  )
  return rows.map((row) => ({
    author: row.author,
    languageCode: row.languageCode,
    total: Number(row.total),
  }))
}

/**
 * Inserta o actualiza por pasaje+autor+idioma. Reimportar el mismo fichero
 * actualiza el texto en vez de duplicar filas (clave uniq_commentary_passage).
 */
export async function upsertCommentaries(entries: CommentaryInput[]): Promise<number> {
  if (entries.length === 0) return 0
  await ensureCommentaryTables()

  const values = entries.map((entry) => [
    entry.bibleId ?? ANY_BIBLE_ID,
    entry.bookId,
    entry.chapter,
    entry.verseStart,
    entry.verseEnd,
    entry.author,
    entry.languageCode || DEFAULT_COMMENTARY_LANGUAGE,
    entry.contentMd,
  ])

  const [result] = await getPool().query<ResultSetHeader>(
    `INSERT INTO bible_commentaries
       (bible_id, book_id, chapter, verse_start, verse_end, author, language_code, content_md)
     VALUES ?
     ON DUPLICATE KEY UPDATE content_md = VALUES(content_md)`,
    [values],
  )
  return result.affectedRows
}

function toCommentary(row: CommentaryRow): Commentary {
  return {
    id: Number(row.id),
    bibleId: Number(row.bibleId),
    bookId: Number(row.bookId),
    chapter: Number(row.chapter),
    verseStart: Number(row.verseStart),
    verseEnd: Number(row.verseEnd),
    author: row.author,
    languageCode: row.languageCode,
    contentMd: row.contentMd,
  }
}

/** «Génesis 1:1» o «Génesis 1:1-5»; el rango de un solo versículo no lleva guion. */
export function formatCommentaryRange(
  bookName: string,
  chapter: number,
  verseStart: number,
  verseEnd: number,
): string {
  const range = verseStart === verseEnd ? `${verseStart}` : `${verseStart}-${verseEnd}`
  return `${bookName} ${chapter}:${range}`
}
