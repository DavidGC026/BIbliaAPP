import { stepbibleBookToId } from "./book-map"
import { normalizeStrongCode } from "./strong-code"
import { taggedWordRowPattern } from "./stepbible-paths"
import type { InterlinearWord } from "./tables"

const TAGNT_HEAD =
  /^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)(?:\([^)]+\))?#(\d+)(?:=([A-Za-z()]+))?/

export interface TagntHead {
  book: string
  chapter: number
  verse: number
  position: number
  editions: string
}

export function parseTagntHead(column1: string): TagntHead | null {
  const match = column1.trim().match(TAGNT_HEAD)
  if (!match) return null
  return {
    book: match[1],
    chapter: Number(match[2]),
    verse: Number(match[3]),
    position: Number(match[4]),
    editions: match[5] ?? "",
  }
}

/** `Χριστοῦ (Christou)` → original + transliteración. */
export function parseGreekCell(raw: string): { original: string; transliteration: string | null } {
  const match = raw.trim().match(/^(.*?)(?:\s+\(([^)]*)\))\s*$/)
  if (match) {
    return { original: match[1].trim(), transliteration: match[2].trim() || null }
  }
  return { original: raw.trim(), transliteration: null }
}

function firstLemma(dictionaryForm: string): string | null {
  const token = dictionaryForm.split("+")[0]?.trim() ?? ""
  const lemma = token.split("=")[0]?.trim() ?? ""
  return lemma || null
}

function morphFromExtended(extended: string): string | null {
  const morph = extended
    .split("+")
    .map((part) => part.split("=")[1]?.trim() ?? "")
    .filter(Boolean)
    .join("+")
  if (!morph) return null
  return morph.slice(0, 40)
}

/**
 * Una fila TAGNT → palabra de `bible_interlinear`.
 *
 * Las variantes K/O no comparten `position` con la lectura NA: son palabras
 * extra (Hch 8:37, Mc 16:9-20…). Se cargan todas; no se descarta ninguna.
 */
export function tagntRowToWord(columns: string[]): InterlinearWord | null {
  const head = parseTagntHead(columns[0] ?? "")
  if (!head) return null
  const idBook = stepbibleBookToId(head.book)
  if (idBook === null) return null

  const greek = parseGreekCell(columns[1] ?? "")
  if (!greek.original) return null

  const strongRaw = (columns[11] ?? "").trim() || (columns[3] ?? "").split("=")[0]?.trim() || null
  const strongCode = strongRaw ? normalizeStrongCode(strongRaw, "grc") : null

  return {
    idBook,
    chapter: head.chapter,
    verse: head.verse,
    position: head.position,
    original: greek.original.slice(0, 120),
    transliteration: greek.transliteration?.slice(0, 120) ?? null,
    strongCode,
    strongRaw: strongRaw?.slice(0, 80) ?? null,
    morph: morphFromExtended(columns[3] ?? ""),
    lemma: firstLemma(columns[4] ?? "")?.slice(0, 120) ?? null,
    glossEs: (columns[8] ?? "").trim() || null,
    glossEn: (columns[2] ?? "").trim() || null,
    language: "grc",
  }
}

export function isTagntDataRow(line: string): boolean {
  return taggedWordRowPattern().test(line)
}
