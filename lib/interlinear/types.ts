export type InterlinearLanguage = "grc" | "heb" | "arc"

/** Palabra lista para la API y el panel del lector. */
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
  language: InterlinearLanguage
  definition: string | null
}
