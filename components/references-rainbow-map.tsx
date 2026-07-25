"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useTheme } from "next-themes"
import { isDarkThemeName } from "@/lib/theme"
import useSWR, { useSWRConfig } from "swr"
import { AlertCircle } from "lucide-react"
import { fetcher } from "@/lib/fetcher"
import { RainbowMapLoading } from "@/components/rainbow-map-loading"
import {
  createProgressFetcher,
  progressRatio,
  type DownloadProgress,
} from "@/lib/fetch-with-progress"
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

/** La comparte el explorador para precargar los arcos antes de abrir el mapa. */
export const ARCS_KEY = "/api/references?arcs"

function mb(bytes: number | null | undefined): string {
  if (!bytes) return "0 MB"
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function nf(n: number): string {
  return n.toLocaleString("es")
}

export function ReferencesRainbowMap() {
  const { resolvedTheme } = useTheme()
  const { cache } = useSWRConfig()
  const [download, setDownload] = useState<DownloadProgress | null>(null)
  // El lector con progreso se crea una sola vez: si cambiara en cada
  // renderizado, SWR lo tomaría por otro fetcher.
  const arcsFetcher = useMemo(
    () => createProgressFetcher<{ keys: number[]; arcs: number[] }>(setDownload),
    [],
  )
  const { data, error, isLoading } = useSWR<{ keys: number[]; arcs: number[] }>(
    ARCS_KEY,
    arcsFetcher,
  )
  const { data: catalog } = useSWR<BibleCatalogResponse>("/api/bibles", fetcher)
  const bibleId = catalog?.defaultBibleId ?? catalog?.bibles[0]?.bibleId
  const { data: booksData } = useSWR<{ books: BibleBook[] }>(
    bibleId ? `/api/books?bible=${bibleId}` : null,
    fetcher,
  )
  const [html, setHtml] = useState<string | null>(null)
  // El iframe tarda unos segundos en dibujar los ~190.000 arcos por trozos:
  // sin esperar su aviso, la ilustración de carga desaparecía al montar el
  // iframe y quedaba un hueco en negro hasta que el lienzo terminaba.
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [draw, setDraw] = useState<{ done: number; total: number } | null>(null)
  const [drawn, setDrawn] = useState(false)

  useEffect(() => {
    if (!data?.keys.length || !resolvedTheme) return
    const dark = isDarkThemeName(resolvedTheme)
    const payload = buildPayload(data.keys, data.arcs, booksData?.books ?? [])
    setDrawn(false)
    setDraw(null)
    setHtml(getRainbowHtml(readRainbowTheme(dark), payload))
  }, [data, booksData, resolvedTheme])

  useEffect(() => {
    // Con sandbox="allow-scripts" y sin allow-same-origin, el origen de los
    // mensajes del iframe llega como "null": se filtra por la ventana de
    // origen, nunca por event.origin.
    function onMapMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return
      const msg = event.data as { type?: string; done?: number; total?: number }
      if (msg?.type === "render-progress" && typeof msg.done === "number" && typeof msg.total === "number" && msg.total > 0) {
        setDraw({ done: msg.done, total: msg.total })
      } else if (msg?.type === "rendered") {
        setDrawn(true)
      }
    }
    window.addEventListener("message", onMapMessage)
    return () => window.removeEventListener("message", onMapMessage)
  }, [])

  // Red de seguridad: si el aviso no llegara nunca (un navegador que bloquee
  // postMessage en el sandbox), el velo se retira solo y el mapa queda usable.
  useEffect(() => {
    if (!html || drawn) return
    const timer = setTimeout(() => setDrawn(true), 20000)
    return () => clearTimeout(timer)
  }, [html, drawn])

  // Al salir del mapa se suelta el agregado de arcos: son varios MB que la
  // caché de SWR retendría el resto de la sesión, y al volver lo sirve el
  // navegador desde su propia caché (la ruta manda max-age=86400). Solo al
  // desmontar: vaciarlo estando montado dejaría la pantalla sin datos.
  useEffect(() => () => void cache.delete(ARCS_KEY), [cache])

  if (isLoading) {
    const ratio = progressRatio(download)
    return (
      <RainbowMapLoading
        ratio={ratio}
        phase={
          ratio === null
            ? "Pidiendo las referencias cruzadas"
            : `Descargando referencias · ${mb(download?.loaded)} de ${mb(download?.total)}`
        }
      />
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
    // Los datos ya están: lo que queda es construir el documento del mapa.
    return <RainbowMapLoading ratio={1} phase="Generando el mapa" />
  }

  return (
    <div className="relative h-full w-full">
      <iframe
        ref={iframeRef}
        srcDoc={html}
        className="block h-full w-full bg-background"
        sandbox="allow-scripts"
        title="Mapa de referencias"
      />
      {!drawn ? (
        // La ilustración sigue encima hasta que el lienzo avisa de que los
        // arcos están completos; mientras, la barra enseña el dibujo real.
        <div className="absolute inset-0 z-10">
          <RainbowMapLoading
            ratio={draw ? draw.done / draw.total : null}
            phase={
              draw
                ? `Dibujando ${nf(draw.done)} de ${nf(draw.total)} conexiones`
                : "Preparando el lienzo"
            }
          />
        </div>
      ) : null}
    </div>
  )
}
