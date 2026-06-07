"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"

// Map standard USFM book abbreviations to database book IDs (1-66)
const bookAbbrToIdMap: Record<string, number> = {
  "GEN": 1, "EXO": 2, "LEV": 3, "NUM": 4, "DEU": 5, "JOS": 6, "JDG": 7, "RUT": 8, "1SA": 9, "2SA": 10,
  "1KI": 11, "2KI": 12, "1CH": 13, "2CH": 14, "EZR": 15, "NEH": 16, "EST": 17, "JOB": 18, "PSA": 19, "PRO": 20,
  "ECC": 21, "SNG": 22, "ISA": 23, "JER": 24, "LAM": 25, "EZK": 26, "DAN": 27, "HOS": 28, "JOL": 29, "AMO": 30,
  "OBA": 31, "JON": 32, "MIC": 33, "NAM": 34, "HAB": 35, "ZEP": 36, "HAG": 37, "ZEC": 38, "MAL": 39, "MAT": 40,
  "MRK": 41, "LUK": 42, "JHN": 43, "ACT": 44, "ROM": 45, "1CO": 46, "2CO": 47, "GAL": 48, "EPH": 49, "PHP": 50,
  "COL": 51, "1TH": 52, "2TH": 53, "1TI": 54, "2TI": 55, "TIT": 56, "PHM": 57, "HEB": 58, "JAS": 59, "1PE": 60,
  "2PE": 61, "1JN": 62, "2JN": 63, "3JN": 64, "JUD": 65, "REV": 66
}

export default function DeepLinkRedirect() {
  const params = useParams()
  const router = useRouter()

  useEffect(() => {
    if (!params) return

    const version = params.version as string
    const passage = params.passage as string

    if (!version || !passage) {
      router.replace("/")
      return
    }

    // YouVersion passage format: BOOK.chapter.verseStart-verseEnd.versionAbbr
    // Example: 1PE.5.10-11.RVR1960 or GEN.1.1
    const parts = passage.split(".")
    const bookAbbr = parts[0]?.toUpperCase()
    const chapter = parts[1] ? parseInt(parts[1], 10) : 1
    const versePart = parts[2] || "" // e.g. "10-11" or "10"

    const bookId = bookAbbrToIdMap[bookAbbr] || 1 // Fallback to Genesis if book not found
    
    // Parse bible version (if it's a number like 149)
    const bibleId = parseInt(version, 10)
    const targetBible = !isNaN(bibleId) ? bibleId : 149 // Fallback to 149

    const redirectUrl = `/?bible=${targetBible}&book=${bookId}&chapter=${chapter}${versePart ? `&verse=${versePart}` : ""}`
    router.replace(redirectUrl)
  }, [params, router])

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground text-sm font-medium">
      <div className="flex flex-col items-center gap-3">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Cargando pasaje bíblico...</p>
      </div>
    </div>
  )
}
