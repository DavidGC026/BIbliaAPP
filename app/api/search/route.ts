import { type NextRequest, NextResponse } from "next/server"
import { searchVerses } from "@/lib/bible"
import { getPool } from "@/lib/mysql"

function normalize(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const bibleId = Number(searchParams.get("bible"))
    const q = searchParams.get("q")?.trim()

    if (!bibleId) {
      return NextResponse.json(
        { error: "El parámetro 'bible' es requerido." },
        { status: 400 },
      )
    }
    if (!q || q.length < 2) {
      return NextResponse.json(
        { error: "El parámetro 'q' debe tener al menos 2 caracteres." },
        { status: 400 },
      )
    }

    // Match YouVersion or custom domain bible URLs
    // e.g. https://www.bible.com/es/bible/149/1PE.5.10-11.RVR1960
    const urlMatch = q.match(/(?:\/bible\/)(\d+)\/([a-zA-Z0-9]+)\.(\d+)\.(\d+)(?:-(\d+))?/)

    if (urlMatch) {
      const urlBibleId = Number(urlMatch[1])
      const bookAbbr = urlMatch[2].toUpperCase()
      const chapterNum = Number(urlMatch[3])
      const verseStart = Number(urlMatch[4])
      const verseEnd = urlMatch[5] ? Number(urlMatch[5]) : verseStart

      // Map USFM book abbreviation to database book ID
      const bookAbbrToIdMap: Record<string, number> = {
        "GEN": 1, "EXO": 2, "LEV": 3, "NUM": 4, "DEU": 5, "JOS": 6, "JDG": 7, "RUT": 8, "1SA": 9, "2SA": 10,
        "1KI": 11, "2KI": 12, "1CH": 13, "2CH": 14, "EZR": 15, "NEH": 16, "EST": 17, "JOB": 18, "PSA": 19, "PRO": 20,
        "ECC": 21, "SNG": 22, "ISA": 23, "JER": 24, "LAM": 25, "EZK": 26, "DAN": 27, "HOS": 28, "JOL": 29, "AMO": 30,
        "OBA": 31, "JON": 32, "MIC": 33, "NAM": 34, "HAB": 35, "ZEP": 36, "HAG": 37, "ZEC": 38, "MAL": 39, "MAT": 40,
        "MRK": 41, "LUK": 42, "JHN": 43, "ACT": 44, "ROM": 45, "1CO": 46, "2CO": 47, "GAL": 48, "EPH": 49, "PHP": 50,
        "COL": 51, "1TH": 52, "2TH": 53, "1TI": 54, "2TI": 55, "TIT": 56, "PHM": 57, "HEB": 58, "JAS": 59, "1PE": 60,
        "2PE": 61, "1JN": 62, "2JN": 63, "3JN": 64, "JUD": 65, "REV": 66
      }

      const bookId = bookAbbrToIdMap[bookAbbr]
      if (bookId) {
        const targetBibleId = urlBibleId || bibleId
        let sql = `
          SELECT bv.idVerse AS id, bv.idBook AS bookId, bb.name AS bookName,
                 bv.chapter, bv.verse, bv.text
          FROM bible_verses bv
          JOIN bible_books bb ON bv.idBook = bb.idBook
          WHERE bv.idBible = ? AND bv.idBook = ? AND bv.chapter = ?
        `
        const params: any[] = [targetBibleId, bookId, chapterNum]

        if (!isNaN(verseStart)) {
          sql += " AND bv.verse >= ? AND bv.verse <= ?"
          params.push(verseStart, verseEnd)
        }

        sql += " ORDER BY bv.verse LIMIT 150"

        const [verses] = await getPool().query<any[]>(sql, params)

        if (verses.length > 0) {
          return NextResponse.json({ verses, total: verses.length, isReference: true })
        }
      }
    }

    // Regex to match reference queries like "1 pedro 5", "juan 3:16", "génesis 1:1-3"
    const refRegex = /^(?:(\d+)\s+)?([a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+?)\s+(\d+)(?:\s*[\:\,]\s*(\d+)(?:\s*[\-\–]\s*(\d+))?)?$/
    const match = q.match(refRegex)

    if (match) {
      const leadingNumber = match[1]
      const bookName = match[2]
      const chapterNum = Number(match[3])
      const verseStart = match[4] ? Number(match[4]) : null
      const verseEnd = match[5] ? Number(match[5]) : (verseStart ? verseStart : null)

      const searchBookName = (leadingNumber ? leadingNumber + " " : "") + bookName.trim()
      const normalizedSearch = normalize(searchBookName)

      // Get all books to find match
      const [allBooks] = await getPool().query<any[]>(
        "SELECT idBook AS bookId, name AS bookName FROM bible_books"
      )

      // Find best matching book name
      let matchedBook = allBooks.find(b => normalize(b.bookName).startsWith(normalizedSearch))
      if (!matchedBook) {
        matchedBook = allBooks.find(b => normalize(b.bookName).includes(normalizedSearch))
      }

      if (matchedBook) {
        let sql = `
          SELECT bv.idVerse AS id, bv.idBook AS bookId, bb.name AS bookName,
                 bv.chapter, bv.verse, bv.text
          FROM bible_verses bv
          JOIN bible_books bb ON bv.idBook = bb.idBook
          WHERE bv.idBible = ? AND bv.idBook = ? AND bv.chapter = ?
        `
        const params: any[] = [bibleId, matchedBook.bookId, chapterNum]

        if (verseStart !== null && verseEnd !== null) {
          sql += " AND bv.verse >= ? AND bv.verse <= ?"
          params.push(verseStart, verseEnd)
        }

        sql += " ORDER BY bv.verse LIMIT 150"

        const [verses] = await getPool().query<any[]>(sql, params)

        if (verses.length > 0) {
          return NextResponse.json({ verses, total: verses.length, isReference: true })
        }
      }
    }

    // Fallback to text search
    const verses = await searchVerses(bibleId, q, 150)
    return NextResponse.json({ verses, total: verses.length, isReference: false })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}
