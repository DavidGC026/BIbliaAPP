import { BOOK_ABBR_TO_ID } from "../bible-url"

/**
 * Abreviaturas STEPBible en TAGNT/TAHOT, orden canónico 1–66.
 * Coinciden con USFM (lib/bible-url.ts); solo cambia la capitalización.
 */
export const STEPBIBLE_BOOK_ABBRS = [
  "Gen", "Exo", "Lev", "Num", "Deu", "Jos", "Jdg", "Rut", "1Sa", "2Sa",
  "1Ki", "2Ki", "1Ch", "2Ch", "Ezr", "Neh", "Est", "Job", "Psa", "Pro",
  "Ecc", "Sng", "Isa", "Jer", "Lam", "Ezk", "Dan", "Hos", "Jol", "Amo",
  "Oba", "Jon", "Mic", "Nam", "Hab", "Zep", "Hag", "Zec", "Mal", "Mat",
  "Mrk", "Luk", "Jhn", "Act", "Rom", "1Co", "2Co", "Gal", "Eph", "Php",
  "Col", "1Th", "2Th", "1Ti", "2Ti", "Tit", "Phm", "Heb", "Jas", "1Pe",
  "2Pe", "1Jn", "2Jn", "3Jn", "Jud", "Rev",
] as const

export type StepbibleBookAbbr = (typeof STEPBIBLE_BOOK_ABBRS)[number]

export function isStepbibleBookAbbr(value: string): value is StepbibleBookAbbr {
  return (STEPBIBLE_BOOK_ABBRS as readonly string[]).includes(value)
}

/** Resuelve Gen / GEN / gen → bible_books.idBook. */
export function stepbibleBookToId(abbr: string): number | null {
  const id = BOOK_ABBR_TO_ID[abbr.trim().toUpperCase()]
  return id ?? null
}

export function stepbibleBookToIdOrThrow(abbr: string): number {
  const id = stepbibleBookToId(abbr)
  if (id === null) {
    throw new Error(`Abreviatura STEPBible desconocida: ${abbr}`)
  }
  return id
}
