/**
 * Importador de comentarios bíblicos de dominio público.
 *
 * Lee un JSON o un CSV y lo vuelca en `bible_commentaries` con upsert: volver a
 * pasar el mismo fichero actualiza los textos en lugar de duplicar filas, así
 * que se puede reimportar sin miedo tras corregir una fuente.
 *
 *   npx tsx scripts/import_commentaries.ts scripts/commentaries-sample.json
 *   npx tsx scripts/import_commentaries.ts comentarios.csv --dry-run
 *
 * Sin argumento usa scripts/commentaries-sample.json.
 *
 * Formatos aceptados
 *   JSON  un array de objetos, o `{ "comentarios": [...] }` / `{ "commentaries": [...] }`
 *   CSV   con cabecera; se aceptan los nombres en snake_case y en camelCase
 *
 * Columnas: bookId, chapter, verseStart, verseEnd, author, contentMd
 *           (opcionales: bibleId → 0 = todas las versiones, languageCode → 'es')
 *
 * Ver docs/comentarios-biblicos.md.
 */

import { readFileSync } from "node:fs"
import path from "node:path"

import dotenv from "dotenv"

import { getPool } from "../lib/mysql"
import { ANY_BIBLE_ID, DEFAULT_COMMENTARY_LANGUAGE, upsertCommentaries } from "../lib/commentaries"
import type { CommentaryInput } from "../lib/commentaries"

dotenv.config({ path: ".env.local" })

const CHUNK_SIZE = 200

/** Cada clave del fichero se acepta en camelCase y en snake_case. */
const FIELD_ALIASES: Record<string, string> = {
  bookid: "bookId",
  book_id: "bookId",
  chapter: "chapter",
  versestart: "verseStart",
  verse_start: "verseStart",
  verseend: "verseEnd",
  verse_end: "verseEnd",
  author: "author",
  bibleid: "bibleId",
  bible_id: "bibleId",
  languagecode: "languageCode",
  language_code: "languageCode",
  lang: "languageCode",
  contentmd: "contentMd",
  content_md: "contentMd",
  content: "contentMd",
}

function normalizeKeys(raw: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw)) {
    const canonical = FIELD_ALIASES[key.trim().toLowerCase()]
    if (canonical) result[canonical] = value
  }
  return result
}

/**
 * Valida una fila y la convierte al tipo del repositorio. Devuelve el motivo del
 * descarte en vez de lanzar: un fichero de 20.000 filas no debe abortar entero
 * porque una traiga el capítulo vacío.
 */
function toCommentaryInput(
  raw: Record<string, unknown>,
  index: number,
): { entry: CommentaryInput } | { error: string } {
  const row = normalizeKeys(raw)
  const line = `fila ${index + 1}`

  const bookId = Number(row.bookId)
  const chapter = Number(row.chapter)
  const verseStart = Number(row.verseStart)
  // Un comentario de un solo versículo puede omitir verseEnd.
  const verseEnd = row.verseEnd === undefined || row.verseEnd === "" ? verseStart : Number(row.verseEnd)
  const author = String(row.author ?? "").trim()
  const contentMd = String(row.contentMd ?? "").trim()

  if (!Number.isInteger(bookId) || bookId < 1 || bookId > 66) {
    return { error: `${line}: bookId inválido (${String(row.bookId)}); se espera 1-66` }
  }
  if (!Number.isInteger(chapter) || chapter < 1) {
    return { error: `${line}: chapter inválido (${String(row.chapter)})` }
  }
  if (!Number.isInteger(verseStart) || verseStart < 1) {
    return { error: `${line}: verseStart inválido (${String(row.verseStart)})` }
  }
  if (!Number.isInteger(verseEnd) || verseEnd < verseStart) {
    return { error: `${line}: verseEnd (${verseEnd}) es menor que verseStart (${verseStart})` }
  }
  if (!author) return { error: `${line}: falta el autor` }
  if (!contentMd) return { error: `${line}: comentario vacío` }

  const bibleId = row.bibleId === undefined || row.bibleId === "" ? ANY_BIBLE_ID : Number(row.bibleId)
  if (!Number.isInteger(bibleId) || bibleId < 0) {
    return { error: `${line}: bibleId inválido (${String(row.bibleId)})` }
  }

  return {
    entry: {
      bibleId,
      bookId,
      chapter,
      verseStart,
      verseEnd,
      author,
      languageCode: String(row.languageCode || DEFAULT_COMMENTARY_LANGUAGE).trim(),
      contentMd,
    },
  }
}

/**
 * CSV con comillas dobles al estilo RFC 4180: los comentarios llevan comas y
 * saltos de línea dentro del texto, así que no vale partir por comas.
 */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false

  const source = text.replace(/\r\n?/g, "\n")
  for (let i = 0; i < source.length; i++) {
    const char = source[i]

    if (quoted) {
      if (char === '"') {
        // "" dentro de un campo entrecomillado es una comilla literal.
        if (source[i + 1] === '"') {
          field += '"'
          i++
        } else {
          quoted = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') quoted = true
    else if (char === ",") {
      row.push(field)
      field = ""
    } else if (char === "\n") {
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else field += char
  }

  // Última fila si el fichero no termina en salto de línea.
  if (field !== "" || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  const nonEmpty = rows.filter((cells) => cells.some((cell) => cell.trim() !== ""))
  if (nonEmpty.length === 0) return []

  const header = nonEmpty[0].map((cell) => cell.trim())
  return nonEmpty.slice(1).map((cells) =>
    Object.fromEntries(header.map((key, index) => [key, cells[index] ?? ""])),
  )
}

export function parseJson(text: string): Record<string, unknown>[] {
  const parsed = JSON.parse(text)
  if (Array.isArray(parsed)) return parsed
  const list = parsed?.comentarios ?? parsed?.commentaries
  if (Array.isArray(list)) return list
  throw new Error(
    "El JSON debe ser un array, o un objeto con la clave 'comentarios' / 'commentaries'.",
  )
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")
  const file = args.find((arg) => !arg.startsWith("--")) ?? "scripts/commentaries-sample.json"
  const filePath = path.resolve(process.cwd(), file)

  console.log(`📖 Importando comentarios desde ${filePath}`)
  if (dryRun) console.log("🧪 Modo simulación: no se escribe en la base de datos.")

  const text = readFileSync(filePath, "utf8")
  const rows = filePath.toLowerCase().endsWith(".csv") ? parseCsv(text) : parseJson(text)
  console.log(`   ${rows.length} filas leídas.`)

  const entries: CommentaryInput[] = []
  const errors: string[] = []
  rows.forEach((row, index) => {
    const result = toCommentaryInput(row as Record<string, unknown>, index)
    if ("entry" in result) entries.push(result.entry)
    else errors.push(result.error)
  })

  if (errors.length > 0) {
    console.warn(`⚠️  ${errors.length} filas descartadas:`)
    for (const error of errors.slice(0, 20)) console.warn(`   · ${error}`)
    if (errors.length > 20) console.warn(`   · … y ${errors.length - 20} más`)
  }

  if (entries.length === 0) {
    console.error("❌ No hay ninguna fila válida que importar.")
    process.exitCode = 1
    return
  }

  if (dryRun) {
    console.log(`✅ ${entries.length} filas válidas. No se ha escrito nada (--dry-run).`)
    return
  }

  let written = 0
  for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
    const chunk = entries.slice(i, i + CHUNK_SIZE)
    await upsertCommentaries(chunk)
    written += chunk.length
    console.log(`   ${written}/${entries.length}…`)
  }

  const authors = [...new Set(entries.map((entry) => entry.author))].sort()
  console.log(`✅ ${written} comentarios importados.`)
  console.log(`   Autores: ${authors.join(", ")}`)
}

// `import` desde una prueba no debe abrir la base de datos ni cerrarla.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main()
    .catch((err) => {
      console.error("❌ Error en la importación:", err instanceof Error ? err.message : err)
      process.exitCode = 1
    })
    .finally(() => {
      void getPool().end()
    })
}
