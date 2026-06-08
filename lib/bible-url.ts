/** USFM book abbreviations ↔ database book IDs (1–66) */
export const BOOK_ABBR_TO_ID: Record<string, number> = {
  GEN: 1, EXO: 2, LEV: 3, NUM: 4, DEU: 5, JOS: 6, JDG: 7, RUT: 8, "1SA": 9, "2SA": 10,
  "1KI": 11, "2KI": 12, "1CH": 13, "2CH": 14, EZR: 15, NEH: 16, EST: 17, JOB: 18, PSA: 19, PRO: 20,
  ECC: 21, SNG: 22, ISA: 23, JER: 24, LAM: 25, EZK: 26, DAN: 27, HOS: 28, JOL: 29, AMO: 30,
  OBA: 31, JON: 32, MIC: 33, NAM: 34, HAB: 35, ZEP: 36, HAG: 37, ZEC: 38, MAL: 39, MAT: 40,
  MRK: 41, LUK: 42, JHN: 43, ACT: 44, ROM: 45, "1CO": 46, "2CO": 47, GAL: 48, EPH: 49, PHP: 50,
  COL: 51, "1TH": 52, "2TH": 53, "1TI": 54, "2TI": 55, TIT: 56, PHM: 57, HEB: 58, JAS: 59, "1PE": 60,
  "2PE": 61, "1JN": 62, "2JN": 63, "3JN": 64, JUD: 65, REV: 66,
}

export const BOOK_ID_TO_ABBR: Record<number, string> = Object.fromEntries(
  Object.entries(BOOK_ABBR_TO_ID).map(([abbr, id]) => [id, abbr]),
)

export interface ParsedPassageSlug {
  bookAbbr: string
  chapter: number
  verse: string
  bibleAbbr?: string
}

/** Parses YouVersion-style slugs: GEN.1.4.RVR1960, 2CH.14.15.NTV, 1PE.5.10-11.RVR1960 */
export function parsePassageSlug(passage: string): ParsedPassageSlug | null {
  const parts = passage.split(".")
  if (parts.length < 2) return null

  const bookAbbr = parts[0].toUpperCase()
  const chapter = parseInt(parts[1], 10)
  if (isNaN(chapter)) return null

  if (parts.length === 2) {
    return { bookAbbr, chapter, verse: "1" }
  }

  const last = parts[parts.length - 1]
  const lastIsBibleAbbr = parts.length >= 4 && /[A-Za-z]/.test(last)

  if (lastIsBibleAbbr) {
    return {
      bookAbbr,
      chapter,
      verse: parts.slice(2, -1).join(".") || "1",
      bibleAbbr: last.toUpperCase(),
    }
  }

  return { bookAbbr, chapter, verse: parts.slice(2).join(".") || "1" }
}

export function buildBiblePassageUrl(options: {
  origin?: string
  bibleId: number
  bookId: number
  chapter: number
  verseRange: string
  bibleAbbr: string
}): string {
  const bookAbbr = BOOK_ID_TO_ABBR[options.bookId] || "GEN"
  const origin = options.origin || "https://biblia2.dvguzman.com"
  return `${origin}/es/bible/${options.bibleId}/${bookAbbr}.${options.chapter}.${options.verseRange}.${options.bibleAbbr}`
}

export function buildHomeReaderQuery(options: {
  bibleId: number
  bookId: number
  chapter: number
  verse?: string
}): string {
  const params = new URLSearchParams()
  params.set("bible", String(options.bibleId))
  params.set("book", String(options.bookId))
  params.set("chapter", String(options.chapter))
  if (options.verse) params.set("verse", options.verse)
  return `/?${params.toString()}`
}

export function getReaderDeepLinkFromSearch(search: string): {
  bible: number | null
  book: number | null
  chapter: number | null
  verse: number | null
} | null {
  const params = new URLSearchParams(search)
  if (!params.has("bible") && !params.has("book") && !params.has("chapter") && !params.has("verse")) {
    return null
  }

  const bible = params.get("bible") ? parseInt(params.get("bible")!, 10) : null
  const book = params.get("book") ? parseInt(params.get("book")!, 10) : null
  const chapter = params.get("chapter") ? parseInt(params.get("chapter")!, 10) : null
  const verseRaw = params.get("verse")
  const verseMatch = verseRaw?.match(/^(\d+)/)
  const verse = verseMatch ? parseInt(verseMatch[1], 10) : null

  return {
    bible: bible !== null && !isNaN(bible) ? bible : null,
    book: book !== null && !isNaN(book) ? book : null,
    chapter: chapter !== null && !isNaN(chapter) ? chapter : null,
    verse: verse !== null && !isNaN(verse) ? verse : null,
  }
}

const READER_DEEPLINK_KEY = "biblia_reader_deeplink"
const READER_DEEPLINK_LOCK_KEY = "biblia_reader_deeplink_lock"

export type ReaderDeepLink = NonNullable<ReturnType<typeof getReaderDeepLinkFromSearch>>

export function saveReaderDeepLink(link: ReaderDeepLink) {
  if (typeof window === "undefined") return
  sessionStorage.setItem(READER_DEEPLINK_KEY, JSON.stringify(link))
}

export function loadReaderDeepLink(): ReaderDeepLink | null {
  if (typeof window === "undefined") return null

  const fromUrl = getReaderDeepLinkFromSearch(window.location.search)
  if (fromUrl) {
    saveReaderDeepLink(fromUrl)
    lockReaderDeepLink()
    return fromUrl
  }

  if (isReaderDeepLinkLocked()) {
    const raw = sessionStorage.getItem(READER_DEEPLINK_KEY)
    if (raw) {
      try {
        return JSON.parse(raw) as ReaderDeepLink
      } catch {
        sessionStorage.removeItem(READER_DEEPLINK_KEY)
      }
    }
  }

  const raw = sessionStorage.getItem(READER_DEEPLINK_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as ReaderDeepLink
  } catch {
    sessionStorage.removeItem(READER_DEEPLINK_KEY)
    return null
  }
}

export function clearReaderDeepLink() {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(READER_DEEPLINK_KEY)
}

export function lockReaderDeepLink() {
  if (typeof window === "undefined") return
  sessionStorage.setItem(READER_DEEPLINK_LOCK_KEY, "1")
}

export function isReaderDeepLinkLocked() {
  if (typeof window === "undefined") return false
  return sessionStorage.getItem(READER_DEEPLINK_LOCK_KEY) === "1"
}

export function unlockReaderDeepLink() {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(READER_DEEPLINK_LOCK_KEY)
  clearReaderDeepLink()
}
