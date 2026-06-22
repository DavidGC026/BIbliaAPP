"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { fetcher } from "@/lib/fetcher"
import { buildBiblePassageUrl, BOOK_ID_TO_ABBR } from "@/lib/bible-url"
import type { Book, Verse, NoteLink, BibleVersion } from "@/lib/types"
import { NotePanel } from "../note-panel"
import { NotebookSidebar } from "../notebook-sidebar"
import { VerseImageCreator } from "../verse-image-creator"
import { FileText, ChevronLeft, ChevronRight, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { insertHtmlIntoNoteContent } from "@/lib/note-content"
import { VerseText, type HighlightColor } from "./verse-text"
import { ReaderToolbar } from "./reader-toolbar"
import { VersionSelector, BookSelector, ChapterSelector } from "./version-selector"
import { ReaderSearch } from "./reader-search"

const bookAbbrMap = BOOK_ID_TO_ABBR

export interface BibleReaderProps {
  initialBookId?: number | null
  initialChapter?: number | null
  initialVerse?: number | null
  initialBibleId?: number | null
  onClearInitialValues?: () => void
  showOnlyVerseNotes?: boolean
  isGuest?: boolean
  onLoginRequest?: () => void
}

/** Formatea [1,2,3,5] como "1-3,5" */
function formatVerseRange(versesList: number[]): string {
  if (versesList.length === 0) return ""
  const sorted = [...versesList].sort((a, b) => a - b)
  const ranges: string[] = []
  let start = sorted[0]
  let end = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i]
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`)
      start = sorted[i]
      end = sorted[i]
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`)
  return ranges.join(",")
}

/**
 * Orquestador del lector bíblico. La UI está descompuesta en:
 *  - verse-text.tsx       → renderizado memoizado de cada versículo
 *  - reader-toolbar.tsx   → barra flotante de acciones sobre la selección
 *  - version-selector.tsx → selects de versión / libro / capítulo
 *  - reader-search.tsx    → buscador con debounce y recientes
 *
 * Este componente solo gestiona estado compartido, SWR y los handlers.
 */
export function BibleReader({
  initialBookId,
  initialChapter,
  initialVerse,
  initialBibleId,
  onClearInitialValues,
  showOnlyVerseNotes = false,
  isGuest = false,
  onLoginRequest,
}: BibleReaderProps = {}) {
  const searchParams = useSearchParams()
  const paramsAppliedRef = useRef(false)
  const skipClearSelectionRef = useRef(false)
  const isFirstRender = useRef(true)

  // ---------------------------------------------------------------- Datos
  const { data: biblesData, isLoading: biblesLoading } = useSWR<{ bibles: BibleVersion[] }>(
    "/api/bibles",
    fetcher,
  )
  const bibles = biblesData?.bibles ?? []
  const [bibleId, setBibleId] = useState<number>(149)

  const { data: booksData } = useSWR<{ books: Book[] }>(
    bibleId ? `/api/books?bible=${bibleId}` : null,
    fetcher,
  )
  const books = booksData?.books ?? []

  // ---------------------------------------------------------- Navegación
  const [bookId, setBookId] = useState<number | null>(1)
  const [chapter, setChapter] = useState(1)
  const [currentVerse, setCurrentVerse] = useState<number>(1)
  const [highlightedVerse, setHighlightedVerse] = useState<number | null>(null)

  const currentBook = useMemo(
    () => books.find((b) => Number(b.bookId) === bookId) ?? null,
    [books, bookId],
  )
  const currentBible = useMemo(
    () => bibles.find((b) => Number(b.bibleId) === bibleId) ?? null,
    [bibles, bibleId],
  )
  const chapterCount = currentBook ? Number(currentBook.chapters) : 0

  // ------------------------------------------------------------ Selección
  const [selectedVerses, setSelectedVerses] = useState<number[]>([])
  const lastSelectedVerseRef = useRef<number | null>(null)

  // -------------------------------------------------------- UI / Ajustes
  const [mobileMenuTab, setMobileMenuTab] = useState<"selectors" | "search" | "settings" | null>(null)
  const [fontSize, setFontSize] = useState<number>(18)
  const [canShare, setCanShare] = useState(false)
  const [imageCreatorOpen, setImageCreatorOpen] = useState(false)

  // ------------------------------------------------------ Notas / Sidebar
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [activeRef, setActiveRef] = useState<string | null>(null)
  const [creating, setCreating] = useState<number | null>(null)
  const [sidebarTab, setSidebarTab] = useState<"verses" | "notebooks">("verses")
  const [editingNotebookNote, setEditingNotebookNote] = useState<{ id: number; title: string; content: string } | null>(null)
  const [layoutMode, setLayoutMode] = useState<"split" | "bible" | "notebook">(isGuest ? "bible" : "split")

  const toggleMobileTab = (tab: "selectors" | "search" | "settings") => {
    setMobileMenuTab(prev => prev === tab ? null : tab)
  }

  // Valores iniciales por props (navegación interna)
  useEffect(() => {
    if (initialBookId && initialChapter) {
      setBookId(initialBookId)
      setChapter(initialChapter)
      if (initialBibleId) {
        setBibleId(initialBibleId)
      }
      if (initialVerse) {
        setCurrentVerse(initialVerse)
        setHighlightedVerse(initialVerse)
        setSelectedVerses([initialVerse])
      }
      onClearInitialValues?.()
    }
  }, [initialBookId, initialChapter, initialVerse, initialBibleId, onClearInitialValues])

  // Ajustes persistidos
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSize = localStorage.getItem("bible_font_size")
      if (savedSize) {
        const parsed = parseInt(savedSize, 10)
        if (!isNaN(parsed) && parsed >= 14 && parsed <= 28) {
          setFontSize(parsed)
        }
      }
      if (typeof navigator.share === "function") {
        setCanShare(true)
      }
    }
  }, [])

  const changeFontSize = (newSize: number) => {
    const size = Math.min(28, Math.max(14, newSize))
    setFontSize(size)
    localStorage.setItem("bible_font_size", String(size))
  }

  // Deep link por query params (?bible=&book=&chapter=&verse=1-3)
  useEffect(() => {
    if (paramsAppliedRef.current) return

    const pBible = searchParams.get("bible")
    const pBook = searchParams.get("book")
    const pChapter = searchParams.get("chapter")
    const pVerse = searchParams.get("verse")

    let hasParams = false
    if (pBible) {
      const bId = parseInt(pBible, 10)
      if (!isNaN(bId)) {
        setBibleId(bId)
        hasParams = true
      }
    }
    if (pBook) {
      const bkId = parseInt(pBook, 10)
      if (!isNaN(bkId)) {
        setBookId(bkId)
        hasParams = true
      }
    }
    if (pChapter) {
      const ch = parseInt(pChapter, 10)
      if (!isNaN(ch)) {
        setChapter(ch)
        hasParams = true
      }
    }

    if (pVerse) {
      const rangeMatch = pVerse.match(/^(\d+)(?:-(\d+))?$/)
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10)
        const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : start
        if (!isNaN(start)) {
          setCurrentVerse(start)
          setHighlightedVerse(start)
          const selected: number[] = []
          for (let i = start; i <= end; i++) {
            selected.push(i)
          }
          skipClearSelectionRef.current = true
          setSelectedVerses(selected)
          hasParams = true
        }
      }
    }

    if (hasParams) {
      paramsAppliedRef.current = true
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href)
        url.search = ""
        window.history.replaceState({}, "", url.pathname)
      }
    }
  }, [searchParams])

  // Modo "solo notas de versículo" fuerza pestaña y layout
  useEffect(() => {
    if (showOnlyVerseNotes) {
      setSidebarTab("verses")
      if (layoutMode === "notebook") {
        setLayoutMode("split")
      }
    }
  }, [showOnlyVerseNotes, layoutMode])

  // Atajos de teclado globales
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.getAttribute("contenteditable") === "true")
      ) {
        return
      }

      if (e.key === "ArrowLeft") {
        if (chapter > 1) {
          e.preventDefault()
          setChapter(c => Math.max(1, c - 1))
        }
      } else if (e.key === "ArrowRight") {
        if (currentBook && chapter < Number(currentBook.chapters)) {
          e.preventDefault()
          setChapter(c => Math.min(Number(currentBook.chapters), c + 1))
        }
      } else if (e.key === "Escape") {
        if (selectedVerses.length > 0) {
          e.preventDefault()
          setSelectedVerses([])
        }
      } else if (e.key === "/") {
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Buscar palabras"]')
        if (searchInput) {
          e.preventDefault()
          searchInput.focus()
        }
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown)
    return () => window.removeEventListener("keydown", handleGlobalKeyDown)
  }, [chapter, currentBook, selectedVerses])

  // Scroll al versículo resaltado (navegación desde búsqueda/deep link)
  useEffect(() => {
    if (highlightedVerse !== null) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`verse-${highlightedVerse}`)
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [highlightedVerse])

  // ----------------------------------------------------- SWR del capítulo
  const versesKey = bookId ? `/api/verses?bible=${bibleId}&book=${bookId}&chapter=${chapter}` : null
  const { data: versesData, isLoading: versesLoading } = useSWR<{ verses: Verse[] }>(
    versesKey,
    fetcher,
  )
  const verses = versesData?.verses ?? []

  // Registrar actividad de lectura (tras 5s en el capítulo)
  useEffect(() => {
    if (verses.length > 0 && bookId) {
      const timer = setTimeout(() => {
        fetch("/api/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookId, chaptersCount: 1, versesCount: verses.length })
        }).catch(console.error)
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [verses.length, bookId, chapter])

  const linksKey = !isGuest && bookId ? `/api/links?book=${bookId}&chapter=${chapter}` : null
  const { data: linksData, mutate: mutateLinks } = useSWR<{ links: NoteLink[] }>(
    linksKey,
    fetcher,
  )
  const linksByVerse = useMemo(() => {
    const map = new Map<number, NoteLink>()
    for (const l of linksData?.links ?? []) map.set(Number(l.verse), l)
    return map
  }, [linksData])

  const highlightsKey = !isGuest && bookId && bibleId ? `/api/highlights?book=${bookId}&chapter=${chapter}&bibleId=${bibleId}` : null
  const { data: highlightsData, mutate: mutateHighlights } = useSWR<{ highlights: { verse: number; color: string }[] }>(
    highlightsKey,
    fetcher,
    { revalidateOnFocus: false }
  )
  const highlightsByVerse = useMemo(() => {
    const map = new Map<number, string>()
    for (const h of highlightsData?.highlights ?? []) {
      map.set(Number(h.verse), h.color)
    }
    return map
  }, [highlightsData])

  // Limpiar selección al cambiar de pasaje
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (skipClearSelectionRef.current) {
      skipClearSelectionRef.current = false
      return
    }
    setSelectedVerses([])
  }, [bookId, chapter])

  // Validar que el libro exista en la versión activa
  useEffect(() => {
    if (!bookId || books.length === 0) return
    const exists = books.some((b) => Number(b.bookId) === Number(bookId))
    if (!exists) {
      setBookId(Number(books[0].bookId))
      setChapter(1)
      setCurrentVerse(1)
    }
  }, [books, bookId])

  // Scroll-spy: actualizar versículo actual según el scroll
  useEffect(() => {
    const handleScroll = () => {
      const verseEls = Array.from(document.querySelectorAll<HTMLElement>('li[id^="verse-"]'))
      for (const el of verseEls) {
        const r = el.getBoundingClientRect()
        if (r.top >= 120) {
          const v = Number(el.id.replace("verse-", ""))
          if (!Number.isNaN(v)) setCurrentVerse(v)
          break
        }
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // ----------------------------------------------- Handlers (estables para memo)
  const toggleVerseSelection = useCallback((verseNum: number, shiftKey: boolean) => {
    setSelectedVerses(prev => {
      const lastSelected = lastSelectedVerseRef.current
      if (shiftKey && prev.length > 0) {
        const anchor = lastSelected !== null && prev.includes(lastSelected) ? lastSelected : prev[0]
        const start = Math.min(anchor, verseNum)
        const end = Math.max(anchor, verseNum)
        const range: number[] = []
        for (let i = start; i <= end; i++) {
          range.push(i)
        }
        lastSelectedVerseRef.current = verseNum
        return Array.from(new Set([...prev, ...range])).sort((a, b) => a - b)
      }

      lastSelectedVerseRef.current = verseNum
      if (prev.includes(verseNum)) {
        return prev.filter(x => x !== verseNum)
      }
      return [...prev, verseNum].sort((a, b) => a - b)
    })
  }, [])

  const setCurrentVerseStable = useCallback((verseNum: number) => {
    setCurrentVerse(verseNum)
  }, [])

  const handleVerseNote = useCallback(async (v: Verse) => {
    if (isGuest) {
      onLoginRequest?.()
      return
    }
    setSidebarTab("verses")
    const existing = linksByVerse.get(Number(v.verse))
    if (existing) {
      setActiveNoteId(String(existing.id))
      setActiveRef(`${v.bookName} ${v.chapter}:${v.verse}`)
      return
    }
    setCreating(Number(v.verse))
    const token = localStorage.getItem("biblia_token")
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          bookId: v.bookId,
          bookName: v.bookName,
          chapter: v.chapter,
          verse: v.verse,
          text: v.text,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("biblia_token")
          window.location.reload()
          return
        }
        throw new Error(data.error)
      }
      await mutateLinks()
      setActiveNoteId(String(data.id))
      setActiveRef(`${v.bookName} ${v.chapter}:${v.verse}`)
    } catch (e) {
      const message = e instanceof Error ? e.message : "No se pudo crear la nota"
      alert(message)
    } finally {
      setCreating(null)
    }
  }, [isGuest, onLoginRequest, linksByVerse, mutateLinks])

  const handleInsertVerseToNote = useCallback((v: Verse) => {
    const htmlBlock = `<blockquote><strong>${v.bookName} ${v.chapter}:${v.verse}</strong><br/>${v.text}</blockquote><p><br></p>`
    setEditingNotebookNote(prev => (prev ? { ...prev, content: insertHtmlIntoNoteContent(prev.content, htmlBlock) } : prev))
  }, [])

  // ------------------------------------------- Acciones sobre la selección
  const buildSelectionShareText = useCallback(() => {
    const selectedVersesData = verses
      .filter(v => selectedVerses.includes(Number(v.verse)))
      .sort((a, b) => Number(a.verse) - Number(b.verse))
    if (selectedVersesData.length === 0) return null

    const verseRangeStr = formatVerseRange(selectedVerses)
    const titleLine = `${currentBook?.bookName} ${chapter}:${verseRangeStr}:`
    const bodyLines = selectedVersesData.map(v => `${v.verse}. ${v.text}`).join("\n\n")

    const origin = typeof window !== "undefined" ? window.location.origin : "https://biblia2.dvguzman.com"
    const customUrl = buildBiblePassageUrl({
      origin,
      bibleId: bibleId || 149,
      bookId: Number(currentBook?.bookId) || 1,
      chapter,
      verseRange: verseRangeStr,
      bibleAbbr: currentBible?.abbr || "RVR1960",
    })
    const footerLine = `${currentBook?.bookName.toUpperCase()} ${chapter}:${verseRangeStr}\n${customUrl}`

    return {
      text: `${titleLine}\n\n${bodyLines}\n\n${footerLine}`,
      title: `${currentBook?.bookName} ${chapter}:${verseRangeStr}`,
      url: customUrl,
    }
  }, [selectedVerses, verses, currentBook, chapter, currentBible, bibleId])

  const handleCopySelection = useCallback(async () => {
    const share = buildSelectionShareText()
    if (!share) return
    try {
      await navigator.clipboard.writeText(share.text)
      alert("¡Versículos copiados al portapapeles con formato YouVersion!")
    } catch (err) {
      console.error("Error al copiar al portapapeles:", err)
      alert("No se pudo copiar al portapapeles.")
    }
  }, [buildSelectionShareText])

  const handleShareSelection = useCallback(async () => {
    const share = buildSelectionShareText()
    if (!share) return
    try {
      await navigator.share({ title: share.title, text: share.text, url: share.url })
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Error al compartir:", err)
        alert("No se pudo compartir el contenido.")
      }
    }
  }, [buildSelectionShareText])

  const handleHighlightSelection = useCallback(async (color: HighlightColor | null) => {
    if (selectedVerses.length === 0) return
    try {
      const res = await fetch("/api/highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId,
          chapter,
          verses: selectedVerses,
          color,
          bibleId
        })
      })
      if (!res.ok) throw new Error("Error al guardar destacados")
      await mutateHighlights()
      setSelectedVerses([])
    } catch (err) {
      console.error("Error al guardar destacados:", err)
      alert("No se pudo guardar el destacado.")
    }
  }, [selectedVerses, bookId, chapter, bibleId, mutateHighlights])

  const handleFavoriteSelection = useCallback(async () => {
    if (selectedVerses.length === 0) return
    try {
      await Promise.all(selectedVerses.map(v =>
        fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bibleId, bookId, chapter, verse: v })
        })
      ))
      alert("¡Versículos agregados a favoritos!")
      setSelectedVerses([])
    } catch (err) {
      console.error("Error al guardar favorito:", err)
      alert("No se pudo guardar en favoritos.")
    }
  }, [selectedVerses, bibleId, bookId, chapter])

  const handleClearSelection = useCallback(() => setSelectedVerses([]), [])
  const handleLoginRequest = useCallback(() => onLoginRequest?.(), [onLoginRequest])

  const imageCreatorData = useMemo(() => {
    if (selectedVerses.length === 0) return null
    const selectedVersesData = verses
      .filter((v) => selectedVerses.includes(Number(v.verse)))
      .sort((a, b) => Number(a.verse) - Number(b.verse))
    if (selectedVersesData.length === 0) return null

    const verseRangeStr = formatVerseRange(selectedVerses)
    return {
      text: selectedVersesData.map((v) => v.text).join(" "),
      reference: `${currentBook?.bookName ?? "Biblia"} ${chapter}:${verseRangeStr}`,
      abbr: currentBible?.abbr || "RVR1960",
    }
  }, [selectedVerses, verses, currentBook, chapter, currentBible])

  // -------------------------------------------------------- Navegación UI
  function selectBook(value: string | null) {
    if (!value) return
    setBookId(Number(value))
    setChapter(1)
    setCurrentVerse(1)
    setActiveNoteId(null)
    setMobileMenuTab(null)
  }

  function selectBible(value: string | null) {
    if (!value) return
    setBibleId(Number(value))
    setActiveNoteId(null)
    setHighlightedVerse(currentVerse)
    setMobileMenuTab(null)
  }

  const handleChapterChange = useCallback((newChapter: number) => {
    setChapter(newChapter)
    setMobileMenuTab(null)
  }, [])

  const goToSearchResult = useCallback((v: Verse) => {
    setBookId(Number(v.bookId))
    setChapter(Number(v.chapter))
    setCurrentVerse(Number(v.verse))
    setHighlightedVerse(Number(v.verse))

    // Quitar el flash tras 4 segundos
    setTimeout(() => {
      setHighlightedVerse(null)
    }, 4000)
  }, [])

  const renderLayoutSwitcher = () => (
    <div className="flex items-center rounded-lg border border-border bg-muted/30 p-1">
      <button
        onClick={() => setLayoutMode("split")}
        className={cn(
          "px-2.5 py-1 text-xs font-semibold rounded transition-colors",
          layoutMode === "split"
            ? "bg-background shadow text-foreground font-bold"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Dividido
      </button>
      <button
        onClick={() => setLayoutMode("bible")}
        className={cn(
          "px-2.5 py-1 text-xs font-semibold rounded transition-colors",
          layoutMode === "bible"
            ? "bg-background shadow text-foreground font-bold"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Solo Biblia
      </button>
      {!showOnlyVerseNotes && !isGuest && (
        <button
          onClick={() => setLayoutMode("notebook")}
          className={cn(
            "px-2.5 py-1 text-xs font-semibold rounded transition-colors",
            layoutMode === "notebook"
              ? "bg-background shadow text-foreground font-bold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Solo Cuaderno
        </button>
      )}
    </div>
  )

  const selectionLabel = `${currentBook?.bookName ?? ""} ${chapter}:${formatVerseRange(selectedVerses)}`
  const mobileSelectionLabel = `${currentBook ? (bookAbbrMap[Number(currentBook.bookId)] || currentBook.bookName) : ""} ${chapter}:${formatVerseRange(selectedVerses)}`

  return (
    <div className="mx-auto flex max-w-none w-full flex-col gap-6 px-4 lg:px-6 py-6 lg:flex-row lg:items-start">
      {/* Columna de lectura */}
      <section className={cn("flex-1 min-w-0", layoutMode === "notebook" && "hidden")}>
        <div className="sticky top-2 z-30 mb-3 md:mb-5 rounded-xl border border-border/70 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 p-2 md:p-4">
          <div className="flex flex-col gap-2 md:gap-3">
            {/* Header compacto para móvil */}
            <div className="flex md:hidden items-center justify-between w-full border-b border-border/40 pb-2 mb-1">
              <button
                onClick={() => toggleMobileTab("selectors")}
                className="flex items-center gap-1.5 text-xs font-bold text-foreground bg-muted/40 px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer"
              >
                <span>{currentBible?.abbr || "RVR1960"}</span>
                <span className="text-muted-foreground/60">•</span>
                <span className="text-primary font-serif">
                  {currentBook ? currentBook.bookName : "Libro"} {chapter}
                </span>
                <ChevronRight className={cn("size-3.5 text-muted-foreground transition-transform", mobileMenuTab === "selectors" && "rotate-90")} />
              </button>

              <div className="flex items-center gap-0.5">
                <Button
                  variant={mobileMenuTab === "search" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => {
                    toggleMobileTab("search")
                    if (mobileMenuTab !== "search") {
                      setTimeout(() => {
                        document.querySelector<HTMLInputElement>('input[placeholder*="Buscar palabras"]')?.focus()
                      }, 50)
                    }
                  }}
                  className="size-8 rounded-lg cursor-pointer"
                  title="Buscar"
                >
                  <Search className="size-4" />
                </Button>

                <Button
                  variant={mobileMenuTab === "settings" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => toggleMobileTab("settings")}
                  className="size-8 rounded-lg cursor-pointer text-xs font-bold"
                  title="Ajustes de lectura"
                >
                  <span className="font-serif">Aa</span>
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (isGuest) {
                      onLoginRequest?.()
                      return
                    }
                    const el = document.querySelector<HTMLElement>('aside')
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth' })
                    }
                  }}
                  className="size-8 rounded-lg cursor-pointer text-emerald-600 dark:text-emerald-400"
                  title={isGuest ? "Inicia sesión para ver notas" : "Ver notas"}
                >
                  <FileText className="size-4" />
                </Button>
              </div>
            </div>

            {/* Selectores de versión / libro / capítulo / tamaño */}
            <div className={cn(
              "flex-wrap items-end gap-3",
              mobileMenuTab === "selectors" ? "flex" : "hidden md:flex"
            )}>
              <VersionSelector
                bibles={bibles}
                currentBible={currentBible}
                bibleId={bibleId}
                isLoading={biblesLoading}
                onChange={selectBible}
              />

              <BookSelector
                books={books}
                currentBook={currentBook}
                bookId={bookId}
                onChange={selectBook}
              />

              {currentBook && (
                <ChapterSelector
                  chapter={chapter}
                  chapterCount={chapterCount}
                  onChange={handleChapterChange}
                />
              )}

              <div className="flex flex-col gap-1">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tamaño</p>
                <div className="flex items-center rounded-lg border border-border bg-muted/20 p-0.5 h-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-xs font-semibold cursor-pointer"
                    onClick={() => changeFontSize(fontSize - 1)}
                    disabled={fontSize <= 14}
                    title="Reducir letra"
                  >
                    A-
                  </Button>
                  <span className="px-2 text-xs font-bold text-muted-foreground min-w-[32px] text-center">
                    {fontSize}px
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-xs font-semibold cursor-pointer"
                    onClick={() => changeFontSize(fontSize + 1)}
                    disabled={fontSize >= 28}
                    title="Aumentar letra"
                  >
                    A+
                  </Button>
                </div>
              </div>
            </div>

            {/* Búsqueda + switcher de vista */}
            <div className={cn(
              "flex-wrap items-end justify-between gap-3",
              (mobileMenuTab === "search" || mobileMenuTab === "settings") ? "flex" : "hidden md:flex"
            )}>
              <ReaderSearch
                bibleId={bibleId}
                className={mobileMenuTab === "search" ? "block" : "hidden md:block"}
                onNavigate={goToSearchResult}
              />

              <div className={cn(
                "items-center gap-2 w-full md:w-auto justify-between md:justify-end border-t border-border/40 pt-2 md:pt-0 md:border-0",
                mobileMenuTab === "settings" ? "flex" : "hidden md:flex"
              )}>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Vista</span>
                {renderLayoutSwitcher()}
              </div>
            </div>
          </div>
        </div>

        {!bookId && (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            <p className="text-pretty leading-relaxed">
              Selecciona versión y libro para comenzar a leer.
              {currentBible ? ` Versión activa: ${currentBible.abbr}.` : ""}
            </p>
          </div>
        )}

        {bookId && versesLoading && (
          <p className="text-sm text-muted-foreground">Cargando versículos…</p>
        )}

        {bookId && !versesLoading && verses.length === 0 && (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            <p className="leading-relaxed">
              No se encontraron versículos. Verifica que la tabla{" "}
              <code className="font-mono text-xs">bible_verses</code> esté cargada.
            </p>
          </div>
        )}

        <ol className="space-y-1">
          {verses.map((v) => (
            <VerseText
              key={v.id}
              verse={v}
              fontSize={fontSize}
              hasNote={linksByVerse.has(Number(v.verse))}
              highlightColor={highlightsByVerse.get(Number(v.verse))}
              isSelected={selectedVerses.includes(Number(v.verse))}
              isFlashed={highlightedVerse === Number(v.verse)}
              isGuest={isGuest}
              isCreatingNote={creating === Number(v.verse)}
              showInsertButton={editingNotebookNote !== null}
              onToggleSelect={toggleVerseSelection}
              onSetCurrent={setCurrentVerseStable}
              onNote={handleVerseNote}
              onInsert={handleInsertVerseToNote}
            />
          ))}
        </ol>

        {/* Navegación de capítulo al pie */}
        {bookId && !versesLoading && verses.length > 0 && (
          <div className="mt-8 flex items-center justify-between border-t border-border/60 pt-6 pb-4">
            <Button
              variant="outline"
              onClick={() => setChapter(c => Math.max(1, c - 1))}
              disabled={chapter <= 1}
              className="gap-2 cursor-pointer"
            >
              <ChevronLeft className="size-4" />
              <span>Capítulo anterior</span>
            </Button>

            <span className="text-sm font-semibold text-muted-foreground">
              {currentBook?.bookName} {chapter}
            </span>

            <Button
              variant="outline"
              onClick={() => setChapter(c => Math.min(chapterCount, c + 1))}
              disabled={chapter >= chapterCount}
              className="gap-2 cursor-pointer"
            >
              <span>Capítulo siguiente</span>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </section>

      {/* Panel lateral */}
      {!isGuest && (
      <aside className={cn(
        "min-w-0 w-full self-start lg:sticky lg:top-2",
        layoutMode === "bible" && "hidden",
        layoutMode === "notebook" ? "w-full" : "lg:flex-1"
      )}>
        {layoutMode === "notebook" && (
          <div className="mb-4 flex justify-end">
            {renderLayoutSwitcher()}
          </div>
        )}

        <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm h-[calc(100vh-1rem)]">
          {showOnlyVerseNotes ? (
            <div className="px-4 py-3 border-b border-border bg-muted/10">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Notas de Versículo
              </span>
            </div>
          ) : (
            <div className="flex items-center border-b border-border bg-muted/20 pr-2">
              <button
                onClick={() => setSidebarTab("verses")}
                className={cn(
                  "flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 text-center",
                  sidebarTab === "verses"
                    ? "border-primary text-primary bg-background font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/30"
                )}
              >
                Notas de Versículo
              </button>
              <button
                onClick={() => setSidebarTab("notebooks")}
                className={cn(
                  "flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 text-center",
                  sidebarTab === "notebooks"
                    ? "border-primary text-primary bg-background font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/30"
                )}
              >
                Mis Cuadernos
              </button>
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            {sidebarTab === "verses" ? (
              <NotePanel
                noteId={activeNoteId}
                reference={activeRef}
                onClose={() => setActiveNoteId(null)}
                onDeleted={() => mutateLinks()}
                onSessionExpired={() => {
                  localStorage.removeItem("biblia_token")
                  window.location.reload()
                }}
              />
            ) : (
              <NotebookSidebar
                editingNote={editingNotebookNote}
                setEditingNote={(note) => {
                  setEditingNotebookNote(note)
                  if (note) setSidebarTab("notebooks")
                }}
                onSessionExpired={() => {
                  localStorage.removeItem("biblia_token")
                  window.location.reload()
                }}
              />
            )}
          </div>
        </div>
      </aside>
      )}

      {/* Barra flotante de selección */}
      {selectedVerses.length > 0 && (
        <ReaderToolbar
          selectionLabel={selectionLabel}
          mobileLabel={mobileSelectionLabel}
          isGuest={isGuest}
          canShare={canShare}
          canCreateImage={!!imageCreatorData}
          onHighlight={handleHighlightSelection}
          onCopy={handleCopySelection}
          onShare={handleShareSelection}
          onFavorite={handleFavoriteSelection}
          onOpenImageCreator={() => setImageCreatorOpen(true)}
          onClearSelection={handleClearSelection}
          onLoginRequest={handleLoginRequest}
        />
      )}

      {imageCreatorData && (
        <VerseImageCreator
          open={imageCreatorOpen}
          onOpenChange={setImageCreatorOpen}
          text={imageCreatorData.text}
          reference={imageCreatorData.reference}
          abbr={imageCreatorData.abbr}
        />
      )}
    </div>
  )
}
