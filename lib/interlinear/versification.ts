import { stepbibleBookToId } from "./book-map"

export interface PassageRef {
  book: string
  chapter: number
  verse: number
}

const EXPANDED_START = "#DataStart(Expanded)"
const EXPANDED_END = "#DataEnd(Expanded)"

/** Compound source refs (ranges or pairs) are covered by the individual rows. */
const COMPOUND_SOURCE = /[;-]/

/**
 * Acepta Gen.32:1, Gen.32.1, Psa.3:Title y sufijos !a/!b.
 * Title se guarda como verso 0: no choca con Psa.3:1 estándar.
 */
const TAHOT_HEAD =
  /^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)(?:\((?:([1-3]?[A-Za-z]+)\.)?(\d+)\.(\d+)\))?/

export interface TahotHeadRef {
  standard: PassageRef
  hebrew: PassageRef
}

/**
 * Columna 1 de TAHOT: `Gen.31.55(32.1)#01=L`.
 * La referencia principal es NRSV/inglesa; el hebreo va entre paréntesis
 * solo cuando diverge. Ver cabecera del propio fichero TAHOT.
 */
export function parseTahotHeadRef(column1: string): TahotHeadRef | null {
  const match = column1.trim().match(TAHOT_HEAD)
  if (!match) return null
  const book = match[1]
  const standard: PassageRef = {
    book,
    chapter: Number(match[2]),
    verse: Number(match[3]),
  }
  const hebrew: PassageRef = match[5]
    ? {
        book: match[4] ?? book,
        chapter: Number(match[5]),
        verse: Number(match[6]),
      }
    : { ...standard }
  return { standard, hebrew }
}

export function parsePassageRef(raw: string): PassageRef | null {
  const token = raw.trim().replace(/![ab]$/i, "")
  if (!token) return null

  const title = token.match(/^([1-3]?[A-Za-z]+)\.(\d+):Title$/i)
  if (title) {
    return { book: title[1], chapter: Number(title[2]), verse: 0 }
  }

  const colonRange = token.match(/^([1-3]?[A-Za-z]+)\.(\d+):(\d+)(?:-\d+)?$/)
  if (colonRange) {
    return { book: colonRange[1], chapter: Number(colonRange[2]), verse: Number(colonRange[3]) }
  }

  const dotted = token.match(/^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)$/)
  if (dotted) {
    return { book: dotted[1], chapter: Number(dotted[2]), verse: Number(dotted[3]) }
  }

  return null
}

export function passageKey(ref: PassageRef): string {
  return `${ref.book}.${ref.chapter}:${ref.verse}`
}

function sourceTypeScore(sourceType: string): number {
  if (sourceType === "Hebrew") return 100
  if (sourceType.startsWith("Hebrew+")) return 80
  if (sourceType.includes("Hebrew") && !sourceType.includes("Eng-KJV")) return 60
  if (sourceType.includes("Hebrew")) return 40
  return 0
}

function firstStandardRef(standardRaw: string): PassageRef | null {
  const first = standardRaw.split(";")[0]?.trim() ?? ""
  return parsePassageRef(first)
}

/**
 * Mapa hebreo → numeración estándar (KJV/RV60) a partir de la sección
 * expandida de TVTMS. Si un verso no aparece, se asume identidad.
 */
export function parseHebrewToStandardMap(tvtmsText: string): Map<string, PassageRef> {
  const start = tvtmsText.indexOf(EXPANDED_START)
  const end = tvtmsText.indexOf(EXPANDED_END)
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("TVTMS no contiene la sección #DataStart(Expanded)…#DataEnd(Expanded).")
  }

  const chosen = new Map<string, { ref: PassageRef; score: number }>()
  const body = tvtmsText.slice(start, end)

  for (const line of body.split(/\r?\n/)) {
    if (!line || line.startsWith("#") || line.startsWith("'") || line.startsWith("SourceType")) {
      continue
    }
    const columns = line.split("\t")
    const sourceType = columns[0] ?? ""
    const sourceRaw = columns[1] ?? ""
    const standardRaw = columns[2] ?? ""
    const score = sourceTypeScore(sourceType)
    if (score === 0 || COMPOUND_SOURCE.test(sourceRaw)) continue

    const source = parsePassageRef(sourceRaw)
    const standard = firstStandardRef(standardRaw)
    if (!source || !standard) continue
    if (sourceRaw.includes("!")) continue

    const key = passageKey(source)
    const previous = chosen.get(key)
    if (!previous || score > previous.score) {
      chosen.set(key, { ref: standard, score })
    }
  }

  return new Map([...chosen].map(([key, value]) => [key, value.ref]))
}

export function hebrewToStandard(ref: PassageRef, map: Map<string, PassageRef>): PassageRef {
  return map.get(passageKey(ref)) ?? ref
}

export function hebrewRefToBookIds(ref: PassageRef): { idBook: number; chapter: number; verse: number } | null {
  const idBook = stepbibleBookToId(ref.book)
  if (idBook === null) return null
  return { idBook, chapter: ref.chapter, verse: ref.verse }
}
