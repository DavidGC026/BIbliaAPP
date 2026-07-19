"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { isDarkThemeName } from "@/lib/theme"
import useSWR from "swr"
import { AlertCircle, Loader2 } from "lucide-react"
import { fetcher } from "@/lib/fetcher"
import { getRainbowHtml, type RainbowTheme } from "@/lib/rainbow-html"

interface BibleBook {
  bookId: number
  bookName: string
}

interface BibleCatalogResponse {
  bibles: { bibleId: number }[]
  defaultBibleId: number | null
}

function readRainbowTheme(dark: boolean): RainbowTheme {
  const s = getComputedStyle(document.documentElement)
  const css = (name: string) => s.getPropertyValue(name).trim()
  return {
    dark,
    background: css("--background"),
    text: css("--foreground"),
    textMuted: css("--muted-foreground"),
    border: css("--border"),
  }
}

function buildPayload(
  keys: number[],
  arcs: number[],
  books: BibleBook[],
) {
  const bookNames = new Map(books.map((b) => [b.bookId, b.bookName]))
  const labels: string[] = []
  const bookIdx: number[] = []
  const bookNameList: string[] = []
  const chap: number[] = []
  let lastBook = -1
  let bookCounter = -1

  for (const key of keys) {
    const bookId = Math.floor(key / 1000)
    const chapter = key % 1000
    if (bookId !== lastBook) {
      lastBook = bookId
      bookCounter++
      bookNameList.push(bookNames.get(bookId) ?? `Libro ${bookId}`)
    }
    labels.push(`${bookNames.get(bookId) ?? `Libro ${bookId}`} ${chapter}`)
    bookIdx.push(bookCounter)
    chap.push(chapter)
  }

  return { labels, bookIdx, bookNames: bookNameList, chap, arcs }
}

export function ReferencesRainbowMap() {
  const { resolvedTheme } = useTheme()
  const { data, error, isLoading } = useSWR<{ keys: number[]; arcs: number[] }>(
    "/api/references?arcs",
    fetcher,
  )
  const { data: catalog } = useSWR<BibleCatalogResponse>("/api/bibles", fetcher)
  const bibleId = catalog?.defaultBibleId ?? catalog?.bibles[0]?.bibleId
  const { data: booksData } = useSWR<{ books: BibleBook[] }>(
    bibleId ? `/api/books?bible=${bibleId}` : null,
    fetcher,
  )
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    if (!data?.keys.length || !resolvedTheme) return
    const dark = isDarkThemeName(resolvedTheme)
    const payload = buildPayload(data.keys, data.arcs, booksData?.books ?? [])
    setHtml(getRainbowHtml(readRainbowTheme(dark), payload))
  }, [data, booksData, resolvedTheme])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-full text-muted-foreground">
        <Loader2 className="size-8 animate-spin" />
        <p>Preparando visualización…</p>
      </div>
    )
  }

  if (error || !data?.keys.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-full text-muted-foreground">
        <AlertCircle className="size-10 opacity-40" />
        <p className="text-center max-w-md">
          No hay datos de referencias cruzadas para mostrar el mapa.
        </p>
      </div>
    )
  }

  if (!html) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-full text-muted-foreground">
        <Loader2 className="size-8 animate-spin" />
        <p>Generando mapa…</p>
      </div>
    )
  }

  return (
    <iframe
      srcDoc={html}
      className="block h-full w-full bg-background"
      sandbox="allow-scripts"
      title="Mapa de referencias"
    />
  )
}
