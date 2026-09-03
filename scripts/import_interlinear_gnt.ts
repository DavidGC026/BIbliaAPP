/**
 * Carga el interlineal del Nuevo Testamento desde TAGNT (STEPBible, CC BY 4.0).
 *
 *   npx tsx --env-file=.env.local scripts/import_interlinear_gnt.ts
 *   npx tsx --env-file=.env.local scripts/import_interlinear_gnt.ts --fresh
 *   npx tsx --env-file=.env.local scripts/import_interlinear_gnt.ts --dry-run
 *
 * Reanudable: el upsert usa (idBook, chapter, verse, position).
 * --fresh borra antes las filas language='grc'.
 */

import { createReadStream } from "node:fs"
import { createInterface } from "node:readline"

import dotenv from "dotenv"

import { getPool } from "../lib/mysql"
import { tagntFilePaths } from "../lib/interlinear/stepbible-paths"
import { isTagntDataRow, tagntRowToWord } from "../lib/interlinear/tagnt"
import {
  deleteInterlinearByLanguage,
  ensureInterlinearTables,
  upsertInterlinearWords,
  type InterlinearWord,
} from "../lib/interlinear/tables"

dotenv.config({ path: ".env.local" })

const CHUNK_SIZE = 500

function parseArgs(argv: string[]) {
  return {
    fresh: argv.includes("--fresh"),
    dryRun: argv.includes("--dry-run"),
  }
}

async function* readTagntWords(): AsyncGenerator<InterlinearWord> {
  const files = tagntFilePaths()
  if (files.length !== 2) {
    throw new Error("No están los dos ficheros TAGNT en proximas-integraciones/stepbible-data.")
  }

  for (const file of files) {
    const lines = createInterface({ input: createReadStream(file, { encoding: "utf8" }) })
    for await (const line of lines) {
      if (!isTagntDataRow(line)) continue
      const word = tagntRowToWord(line.split("\t"))
      if (word) yield word
    }
  }
}

async function validateLoad(): Promise<void> {
  const pool = getPool()
  const [counts] = await pool.query(
    `SELECT
        COUNT(*) AS words,
        COUNT(DISTINCT CONCAT(idBook, ':', chapter, ':', verse)) AS verses,
        SUM(gloss_es IS NULL OR gloss_es = '') AS empty_gloss,
        SUM(strong_code IS NOT NULL) AS with_strong
     FROM bible_interlinear
     WHERE language = 'grc'`,
  )
  const row = (counts as Array<{
    words: number
    verses: number
    empty_gloss: number
    with_strong: number
  }>)[0]

  const [resolved] = await pool.query(
    `SELECT COUNT(*) AS n
     FROM bible_interlinear i
     JOIN bible_dictionary_entries e ON e.code = i.strong_code
     JOIN bible_dictionaries d ON d.id = e.dictionary_id AND d.slug = 'strong'
     WHERE i.language = 'grc'`,
  )
  const resolvedN = Number((resolved as Array<{ n: number }>)[0]?.n ?? 0)
  const words = Number(row.words)
  const ratio = words === 0 ? 0 : resolvedN / words

  console.log(`  palabras grc:     ${words}`)
  console.log(`  versículos:       ${row.verses}`)
  console.log(`  gloss_es vacía:   ${row.empty_gloss}`)
  console.log(`  strong resuelve:  ${resolvedN}/${words} (${(ratio * 100).toFixed(2)} %)`)

  if (words < 141000 || Number(row.verses) < 7900) {
    throw new Error("La carga NT quedó por debajo de lo esperado.")
  }
  if (Number(row.empty_gloss) > 0) {
    throw new Error("Hay filas NT sin gloss_es.")
  }
  if (ratio < 0.99) {
    throw new Error(`Cobertura Strong NT ${(ratio * 100).toFixed(2)} % < 99 %.`)
  }
}

async function main() {
  const { fresh, dryRun } = parseArgs(process.argv.slice(2))
  console.log("Importador TAGNT (Nuevo Testamento)")
  if (dryRun) console.log("Modo dry-run: no se escribe en la base de datos.\n")

  let seen = 0
  let chunk: InterlinearWord[] = []

  if (!dryRun) {
    await ensureInterlinearTables()
    if (fresh) {
      const removed = await deleteInterlinearByLanguage("grc")
      console.log(`--fresh: borradas ${removed} filas grc`)
    }
  }

  for await (const word of readTagntWords()) {
    seen += 1
    chunk.push(word)
    if (chunk.length >= CHUNK_SIZE) {
      if (!dryRun) await upsertInterlinearWords(chunk)
      chunk = []
      if (seen % 10000 === 0) console.log(`  ${seen} palabras…`)
    }
  }
  if (chunk.length && !dryRun) await upsertInterlinearWords(chunk)

  console.log(`Leídas ${seen} palabras TAGNT`)
  if (dryRun) return

  console.log("\nValidación")
  await validateLoad()
  console.log("Carga NT terminada.")
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    if (process.env.MYSQL_HOST) {
      await getPool().end()
    }
  })
