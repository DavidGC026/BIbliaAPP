import { createReadStream } from "node:fs"
import { readFile } from "node:fs/promises"
import { createInterface } from "node:readline"
import {
  STEPBIBLE_BOOK_ABBRS,
  hebrewToStandard,
  isUnresolvedStrongExpected,
  normalizeStrongCode,
  normalizeStrongCodes,
  parseHebrewToStandardMap,
  parsePassageRef,
  parseTahotHeadRef,
  parseTagntHead,
  parseGreekCell,
  tagntRowToWord,
  passageKey,
  stepbibleBookToId,
  type PassageRef,
} from "./index"
import { taggedWordRowPattern, tagntFilePaths, tahotFilePaths, tvtmsFilePath } from "./stepbible-paths"

let failures = 0

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  OK    ${name}`)
    return
  }
  failures += 1
  console.log(`  FALLA ${name}${detail ? ` — ${detail}` : ""}`)
}

function checkBookMap() {
  console.log("\n1.2  Mapa de libros\n")
  const ids = STEPBIBLE_BOOK_ABBRS.map((abbr) => stepbibleBookToId(abbr))
  assert("hay 66 abreviaturas", STEPBIBLE_BOOK_ABBRS.length === 66, String(STEPBIBLE_BOOK_ABBRS.length))
  assert("todas resuelven", ids.every((id) => id !== null))
  assert("ninguna repetida", new Set(ids).size === 66)
  assert("rango 1–66", ids.every((id) => id !== null && id >= 1 && id <= 66))
  assert("Mal = 39, Mat = 40, Jhn = 43, Rev = 66", ids[38] === 39 && ids[39] === 40 && ids[42] === 43 && ids[65] === 66)
  assert("desconocida → null", stepbibleBookToId("Xxx") === null)
}

function checkStrongNormalizer() {
  console.log("\n1.4  Normalizador Strong (casos unitarios)\n")
  const cases: Array<[string, string[], string?]> = [
    ["H1", ["H1"]],
    ["G5547", ["G5547"]],
    ["G5547=N-GSM-T", ["G5547"]],
    ["G2424G", ["G2424"]],
    ["G5207_A", ["G5207"]],
    ["H9003/{H7225G}", ["H9003", "H7225"]],
    ["{H1254A}", ["H1254"]],
    ["H0905", ["H905"]],
    ["1722", ["G1722"], "grc"],
  ]
  for (const [raw, expected, hint] of cases) {
    const got = normalizeStrongCodes(raw, hint as "grc" | undefined)
    assert(`${raw} → ${expected.join(", ")}`, JSON.stringify(got) === JSON.stringify(expected), JSON.stringify(got))
  }
  assert("macula sin idioma no inventa prefijo", normalizeStrongCode("1722") === null)
  assert("H9003 es excepción esperada", isUnresolvedStrongExpected("H9003"))
  assert("G20447 es excepción esperada", isUnresolvedStrongExpected("G20447"))
  assert("G5547 no es excepción", !isUnresolvedStrongExpected("G5547"))
}

async function forEachTaggedRow(files: string[], onRow: (columns: string[]) => void) {
  const isData = taggedWordRowPattern()
  for (const file of files) {
    const lines = createInterface({ input: createReadStream(file, { encoding: "utf8" }) })
    for await (const line of lines) {
      if (!isData.test(line)) continue
      onRow(line.split("\t"))
    }
  }
}


async function checkVersification() {
  console.log("\n1.6  Versificación TVTMS\n")
  const file = tvtmsFilePath()
  if (!file) {
    console.log("  SALTA  no está proximas-integraciones/stepbible-data (datos locales)")
    return null
  }

  const text = await readFile(file, "utf8")
  const hebrewRows = text
    .slice(text.indexOf("#DataStart(Expanded)"), text.indexOf("#DataEnd(Expanded)"))
    .split(/\r?\n/)
    .filter((line) => line.includes("\t") && line.split("\t")[0]?.includes("Hebrew")).length
  assert("filas Hebrew en expandida = 5031", hebrewRows === 5031, String(hebrewRows))

  const map = parseHebrewToStandardMap(text)
  const mapped = hebrewToStandard({ book: "Gen", chapter: 32, verse: 1 }, map)
  assert(
    "Gen.32:1 (hebreo) → Gen.31:55",
    passageKey(mapped) === "Gen.31:55",
    passageKey(mapped),
  )
  const psalm = hebrewToStandard({ book: "Psa", chapter: 3, verse: 2 }, map)
  assert("Psa.3:2 (hebreo) → Psa.3:1", passageKey(psalm) === "Psa.3:1", passageKey(psalm))
  const title = hebrewToStandard({ book: "Psa", chapter: 3, verse: 1 }, map)
  assert("Psa.3:1 (hebreo, título) → verso 0", title.verse === 0, passageKey(title))
  const identity = hebrewToStandard({ book: "Gen", chapter: 1, verse: 1 }, map)
  assert("Gen.1:1 sin fila → identidad", passageKey(identity) === "Gen.1:1")

  const tahotDual = parseTahotHeadRef("Gen.31.55(32.1)#01=L")
  assert(
    "TAHOT Gen.31.55(32.1) parsea inglés + hebreo",
    Boolean(
      tahotDual &&
        passageKey(tahotDual.standard) === "Gen.31:55" &&
        passageKey(tahotDual.hebrew) === "Gen.32:1",
    ),
  )
  const tahotTitle = parseTahotHeadRef("Psa.3.0(3.1)#01=L")
  assert("TAHOT Psa.3.0 es título (verso 0)", Boolean(tahotTitle && tahotTitle.standard.verse === 0))

  return map
}

async function checkTahotAlignment(map: Map<string, PassageRef> | null) {
  if (!map) return
  const files = tahotFilePaths()
  if (files.length !== 4) {
    console.log("  SALTA  faltan ficheros TAHOT")
    return
  }

  const englishVerses = new Set<string>()
  const hebrewVerses = new Set<string>()
  let divergingPairs = 0
  let tvtmsAgrees = 0
  const disagreeUnique = new Set<string>()

  await forEachTaggedRow(files, (columns) => {
    const parsed = parseTahotHeadRef(columns[0] ?? "")
    if (!parsed) return
    englishVerses.add(passageKey(parsed.standard))
    hebrewVerses.add(passageKey(parsed.hebrew))
    if (passageKey(parsed.standard) === passageKey(parsed.hebrew)) return
    divergingPairs += 1
    const mapped = hebrewToStandard(parsed.hebrew, map)
    if (passageKey(mapped) === passageKey(parsed.standard)) {
      tvtmsAgrees += 1
    } else {
      disagreeUnique.add(
        `${passageKey(parsed.hebrew)} → TVTMS ${passageKey(mapped)} / TAHOT ${passageKey(parsed.standard)}`,
      )
    }
  })

  const agreeRatio = divergingPairs === 0 ? 0 : tvtmsAgrees / divergingPairs
  console.log(`  dato  versículos TAHOT (NRSV/inglés): ${englishVerses.size}`)
  console.log(`  dato  versículos TAHOT (hebreo, con paréntesis): ${hebrewVerses.size}`)
  console.log(`  dato  palabras con numeración distinta: ${divergingPairs}`)
  console.log(`  dato  TVTMS coincide: ${tvtmsAgrees} (${(agreeRatio * 100).toFixed(2)} %)`)
  console.log(`  dato  desacuerdos únicos TVTMS vs TAHOT: ${disagreeUnique.size}`)
  if (disagreeUnique.size) {
    console.log(`  dato  ejemplos: ${[...disagreeUnique].slice(0, 8).join(" | ")}`)
  }

  assert(
    "TAHOT cubre el AT en numeración inglesa (~23.2k, no los 21.178 del plan)",
    englishVerses.size > 23000 && englishVerses.size < 23500,
    String(englishVerses.size),
  )
  assert(
    "TVTMS acuerda ≥ 99 % con los paréntesis hebreos de TAHOT",
    agreeRatio >= 0.99,
    `${(agreeRatio * 100).toFixed(2)} %`,
  )

  if (!process.env.MYSQL_HOST || !process.env.MYSQL_DATABASE) {
    console.log("  SALTA  cruce con bible_verses (faltan MYSQL_*)")
    return
  }

  const { getPool } = await import("../mysql")
  const pool = getPool()
  const [verseRows] = await pool.query(
    `SELECT idBook, chapter, verse
     FROM bible_verses
     WHERE idBible = 149 AND idBook BETWEEN 1 AND 39`,
  )
  const rv60 = new Set(
    (verseRows as Array<{ idBook: number; chapter: number; verse: number }>).map(
      (row) => `${row.idBook}.${row.chapter}:${row.verse}`,
    ),
  )
  let aligned = 0
  for (const key of englishVerses) {
    const ref = parsePassageRef(key)
    if (!ref || ref.verse === 0) continue
    const id = stepbibleBookToId(ref.book)
    if (id && rv60.has(`${id}.${ref.chapter}:${ref.verse}`)) aligned += 1
  }
  console.log(`  dato  versículos AT en RV60 (idBible 149): ${rv60.size}`)
  console.log(`  dato  TAHOT inglés que existen en RV60 (sin títulos v.0): ${aligned}`)
  assert("TAHOT alineado con RV60 ≈ 23.145", aligned >= 23100, String(aligned))
}

async function collectNormalizedCodes() {
  const codes = new Set<string>()
  const tagnt = tagntFilePaths()
  const tahot = tahotFilePaths()
  if (tagnt.length !== 2 || tahot.length !== 4) return null

  await forEachTaggedRow(tagnt, (columns) => {
    for (const raw of [columns[3], columns[11]]) {
      for (const code of normalizeStrongCodes(raw ?? "", "grc")) codes.add(code)
    }
  })
  await forEachTaggedRow(tahot, (columns) => {
    for (const raw of [columns[4], columns[8], columns[11]]) {
      for (const code of normalizeStrongCodes(raw ?? "", "heb")) codes.add(code)
    }
  })
  return codes
}

async function checkStrongAgainstDataAndDb() {
  console.log("\n1.4  Códigos Strong en TAGNT+TAHOT\n")
  const codes = await collectNormalizedCodes()
  if (!codes) {
    console.log("  SALTA  no están los ficheros TAGNT/TAHOT")
    return
  }

  console.log(`  dato  códigos distintos (columnas Strong): ${codes.size}`)
  assert("cerca de 13.979 códigos distintos", Math.abs(codes.size - 13979) <= 10, String(codes.size))

  const expectedMissing = [...codes].filter(isUnresolvedStrongExpected)
  console.log(`  dato  excepciones esperadas (H9xxx/G6xxx): ${expectedMissing.length}`)

  if (!process.env.MYSQL_HOST || !process.env.MYSQL_DATABASE) {
    console.log("  SALTA  resolución contra BD (faltan MYSQL_*)")
    return
  }

  const { getPool } = await import("../mysql")
  const pool = getPool()
  const [rows] = await pool.query(
    `SELECT e.code
     FROM bible_dictionary_entries e
     JOIN bible_dictionaries d ON d.id = e.dictionary_id
     WHERE d.slug = 'strong'`,
  )
  const inDb = new Set((rows as Array<{ code: string }>).map((row) => row.code))
  if (inDb.size === 0) {
    const [legacy] = await pool.query(`SELECT strong_code AS code FROM bible_strong_dictionary`)
    for (const row of legacy as Array<{ code: string }>) inDb.add(row.code)
  }

  const unresolved = [...codes].filter((code) => !inDb.has(code)).sort()
  const unexpected = unresolved.filter((code) => !isUnresolvedStrongExpected(code))
  const resolved = codes.size - unresolved.length
  const ratio = codes.size === 0 ? 0 : resolved / codes.size

  console.log(`  dato  resuelven en BD: ${resolved}/${codes.size} (${(ratio * 100).toFixed(2)} %)`)
  console.log(`  dato  no resuelven: ${unresolved.length}`)
  if (unexpected.length) {
    console.log(`  dato  no resuelven y no estaban previstos: ${unexpected.join(", ")}`)
  }

  assert(
    "cobertura ≥ 99,0 % (plan: 99,1 % sobre 13.979; aquí el denominador es menor)",
    ratio >= 0.99,
    `${(ratio * 100).toFixed(2)} %`,
  )
  assert(
    "los 129 que no resuelven están en la lista de excepciones",
    unexpected.length === 0 && unresolved.length === 129,
    `inesperados=${unexpected.length} total=${unresolved.length}`,
  )

}

async function checkSchema() {
  console.log("\n2.2  Esquema interlineal\n")
  if (!process.env.MYSQL_HOST || !process.env.MYSQL_DATABASE) {
    console.log("  SALTA  faltan MYSQL_*")
    return
  }

  const { ensureInterlinearTables } = await import("./tables")
  await ensureInterlinearTables()
  const { getPool } = await import("../mysql")
  const pool = getPool()

  const [tables] = await pool.query(
    `SELECT table_name, table_rows, ROUND((data_length + index_length)/1024/1024, 2) AS mb
     FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name IN ('bible_interlinear','bible_strong_particles','bible_verses')`,
  )
  const byName = new Map(
    (tables as Array<{ table_name: string; table_rows: number; mb: string }>).map((row) => [
      row.table_name,
      row,
    ]),
  )
  assert("existe bible_interlinear", byName.has("bible_interlinear"))
  assert("existe bible_strong_particles", byName.has("bible_strong_particles"))

  const [verseCount] = await pool.query(`SELECT COUNT(*) AS n FROM bible_verses`)
  const verses = Number((verseCount as Array<{ n: number }>)[0]?.n ?? 0)
  console.log(`  dato  bible_verses: ${verses} filas (${byName.get("bible_verses")?.mb ?? "?"} MB)`)
  assert("bible_verses = 186.672 (plan)", verses === 186672, String(verses))

  const [flags] = await pool.query(`SELECT COUNT(*) AS n FROM bible_bibles WHERE fuertes = 1`)
  const enabled = Number((flags as Array<{ n: number }>)[0]?.n ?? 0)
  assert("ninguna biblia tiene fuertes=1 todavía", enabled === 0, String(enabled))
}

function checkTagntParser() {
  console.log("\n3.1  Parser TAGNT\n")
  const head = parseTagntHead("Mat.1.1#04=NKO")
  assert("Mat.1.1#04=NKO → pos 4 NKO", Boolean(head && head.position === 4 && head.editions === "NKO"))
  const greek = parseGreekCell("Χριστοῦ (Christou)")
  assert("griego + transliteración", greek.original === "Χριστοῦ" && greek.transliteration === "Christou")
  const word = tagntRowToWord([
    "Jhn.1.1#05=NKO",
    "λόγος, (logos)",
    "Word",
    "G3056=N-NSM",
    "λόγος=word",
    "",
    "",
    "",
    "Palabra",
    "",
    "#05",
    "G3056_A",
  ])
  assert(
    "Jn 1:1 λόγος → G3056 / Palabra / libro 43",
    Boolean(word && word.idBook === 43 && word.strongCode === "G3056" && word.glossEs === "Palabra" && word.position === 5),
  )
}

async function checkNtLoad() {
  console.log("\n3.4  Carga NT\n")
  if (!process.env.MYSQL_HOST || !process.env.MYSQL_DATABASE) {
    console.log("  SALTA  faltan MYSQL_*")
    return
  }
  const { getPool } = await import("../mysql")
  const [rows] = await getPool().query(
    `SELECT COUNT(*) AS words,
            COUNT(DISTINCT CONCAT(idBook, ':', chapter, ':', verse)) AS verses,
            SUM(gloss_es IS NULL OR gloss_es = '') AS empty_gloss
     FROM bible_interlinear WHERE language = 'grc'`,
  )
  const row = (rows as Array<{ words: number; verses: number; empty_gloss: number }>)[0]
  const words = Number(row.words)
  console.log(`  dato  palabras grc: ${words}`)
  console.log(`  dato  versículos: ${row.verses}`)
  if (words === 0) {
    console.log("  SALTA  NT aún no cargado")
    return
  }
  assert("NT ≥ 141.720 palabras", words >= 141720, String(words))
  assert("NT ≥ 7.948 versículos", Number(row.verses) >= 7948, String(row.verses))
  assert("cero gloss_es vacía", Number(row.empty_gloss) === 0, String(row.empty_gloss))

  const [john] = await getPool().query(
    `SELECT original, gloss_es, strong_code FROM bible_interlinear
     WHERE language = 'grc' AND idBook = 43 AND chapter = 1 AND verse = 1
     ORDER BY position`,
  )
  const first = (john as Array<{ original: string; gloss_es: string; strong_code: string }>)[0]
  assert("Jn 1:1 empieza por Ἐν / En / G1722", Boolean(first && first.strong_code === "G1722"))
}

async function checkApiQueries() {
  console.log("\n4.1  Consultas de la API\n")
  if (!process.env.MYSQL_HOST || !process.env.MYSQL_DATABASE) {
    console.log("  SALTA  faltan MYSQL_*")
    return
  }

  const { findInterlinearCoverage, findInterlinearWords } = await import("./query")
  const john = await findInterlinearWords({ bookId: 43, chapter: 1, verse: 1 })
  assert("Jn 1:1 devuelve 17 palabras", john.length === 17, String(john.length))
  assert("Jn 1:1 #5 es Palabra / G3056", john[4]?.glossEs === "Palabra" && john[4]?.strongCode === "G3056")
  assert("Jn 1:1 trae definition", Boolean(john[4]?.definition && john[4].definition.length > 10))

  const matthew = await findInterlinearWords({ bookId: 40, chapter: 1 })
  const matthewBytes = Buffer.byteLength(JSON.stringify({ words: matthew }), "utf8")
  console.log(`  dato  Mt 1: ${matthew.length} palabras, ${(matthewBytes / 1024).toFixed(1)} KB JSON`)
  assert("Mt 1 cabe en una respuesta (< 400 KB)", matthewBytes < 400 * 1024, `${matthewBytes} bytes`)

  const coverage = await findInterlinearCoverage()
  const books = "books" in coverage ? coverage.books : []
  assert("coverage lista el NT (27 libros)", books.length === 27, String(books.length))

  const johnChapter = await findInterlinearCoverage({ bookId: 43, chapter: 1 })
  const verses = "verses" in johnChapter ? johnChapter.verses : []
  assert("coverage Jn 1 incluye el verso 1", verses.includes(1))

  const empty = await findInterlinearWords({ bookId: 19, chapter: 119 })
  console.log(`  dato  Sal 119 (aún sin AT): ${empty.length} palabras`)
}

async function main() {
  console.log("\nChequeos del interlineal\n")
  checkBookMap()
  checkStrongNormalizer()
  checkTagntParser()
  const map = await checkVersification()
  await checkTahotAlignment(map)
  await checkStrongAgainstDataAndDb()
  await checkSchema()
  await checkNtLoad()
  await checkApiQueries()

  if (process.env.MYSQL_HOST && process.env.MYSQL_DATABASE) {
    const { getPool } = await import("../mysql")
    await getPool().end()
  }

  console.log("")
  if (failures) {
    console.log(`Resultado: ${failures} fallo(s)`)
    process.exit(1)
  }
  console.log("Resultado: todos los chequeos pasaron")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
