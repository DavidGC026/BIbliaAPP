"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import useSWR from "swr"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { fetcher } from "@/lib/fetcher"
import { buildBiblePassageUrl } from "@/lib/bible-url"
import type { Book, Verse, NoteLink, BibleVersion } from "@/lib/types"
import { NotePanel } from "./note-panel"
import { NotebookSidebar } from "./notebook-sidebar"
import { VerseImageCreator } from "./verse-image-creator"
import { FileText, Plus, ChevronLeft, ChevronRight, Search, X, Loader2, Copy, Share2, LogOut, Star, Image as ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { BOOK_ID_TO_ABBR } from "@/lib/bible-url"

const bookAbbrMap = BOOK_ID_TO_ABBR

export function BibleReader({
  initialBookId,
  initialChapter,
  initialVerse,
  initialBibleId,
  onClearInitialValues,
  showOnlyVerseNotes = false,
  isGuest = false,
  onLoginRequest,
}: {
  initialBookId?: number | null
  initialChapter?: number | null
  initialVerse?: number | null
  initialBibleId?: number | null
  onClearInitialValues?: () => void
  showOnlyVerseNotes?: boolean
  isGuest?: boolean
  onLoginRequest?: () => void
} = {}) {
  const searchParams = useSearchParams()
  const paramsAppliedRef = useRef(false)
  const skipClearSelectionRef = useRef(false)
  const isFirstRender = useRef(true)
  const { data: biblesData } = useSWR<{ bibles: BibleVersion[] }>("/api/bibles", fetcher)
  const bibles = biblesData?.bibles ?? []
  const [bibleId, setBibleId] = useState<number>(149)

  // Handle initial prop values (from navigation)
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
  }, [initialBookId, initialChapter, initialVerse, onClearInitialValues])
  const { data: booksData } = useSWR<{ books: Book[] }>(
    bibleId ? `/api/books?bible=${bibleId}` : null,
    fetcher,
  )
  const books = booksData?.books ?? []

  const [bookId, setBookId] = useState<number | null>(1)

  const currentBook = useMemo(
    () => books.find((b) => Number(b.bookId) === bookId) ?? null,
    [books, bookId],
  )
  const currentBible = useMemo(
    () => bibles.find((b) => Number(b.bibleId) === bibleId) ?? null,
    [bibles, bibleId],
  )
  const [mobileMenuTab, setMobileMenuTab] = useState<"selectors" | "search" | "settings" | null>(null)
  
  const toggleMobileTab = (tab: "selectors" | "search" | "settings") => {
    setMobileMenuTab(prev => prev === tab ? null : tab)
  }
  const [chapter, setChapter] = useState(1)
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [activeRef, setActiveRef] = useState<string | null>(null)
  const [creating, setCreating] = useState<number | null>(null)
  const [selectedVerses, setSelectedVerses] = useState<number[]>([])
  const [lastSelectedVerse, setLastSelectedVerse] = useState<number | null>(null)
  const [fontSize, setFontSize] = useState<number>(18)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [canShare, setCanShare] = useState(false)
  const [imageCreatorOpen, setImageCreatorOpen] = useState(false)

  // Load settings on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSize = localStorage.getItem("bible_font_size")
      if (savedSize) {
        const parsed = parseInt(savedSize, 10)
        if (!isNaN(parsed) && parsed >= 14 && parsed <= 28) {
          setFontSize(parsed)
        }
      }
      const savedSearches = localStorage.getItem("recent_searches")
      if (savedSearches) {
        try {
          setRecentSearches(JSON.parse(savedSearches))
        } catch {
          setRecentSearches([])
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

  const saveSearch = useCallback((query: string) => {
    const trimmed = query.trim()
    if (!trimmed || trimmed.length < 2) return
    setRecentSearches(prev => {
      const filtered = prev.filter(q => q.toLowerCase() !== trimmed.toLowerCase())
      const updated = [trimmed, ...filtered].slice(0, 5)
      localStorage.setItem("recent_searches", JSON.stringify(updated))
      return updated
    })
  }, [])

  // Load and apply query parameters on mount
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

  // Sidebar Tab, Notebook Editing and Layout states
  const [sidebarTab, setSidebarTab] = useState<"verses" | "notebooks">("verses")
  const [editingNotebookNote, setEditingNotebookNote] = useState<{ id: number; title: string; content: string } | null>(null)
  const [layoutMode, setLayoutMode] = useState<"split" | "bible" | "notebook">(isGuest ? "bible" : "split")

  // Force tab state if only verse notes mode is active
  useEffect(() => {
    if (showOnlyVerseNotes) {
      setSidebarTab("verses")
      if (layoutMode === "notebook") {
        setLayoutMode("split")
      }
    }
  }, [showOnlyVerseNotes, layoutMode])

  // Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Verse[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)

    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([])
      setSearchLoading(false)
      return
    }

    setSearchLoading(true)
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?bible=${bibleId}&q=${encodeURIComponent(searchQuery.trim())}`)
        const data = await res.json()
        if (res.ok) {
          setSearchResults(data.verses ?? [])
        } else {
          setSearchResults([])
        }
      } catch {
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }, 400)

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [searchQuery, bibleId])

  // Close search on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // Keyboard Shortcuts Effect
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
        if (searchOpen) {
          e.preventDefault()
          setSearchOpen(false)
        }
      } else if (e.key === "/") {
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Buscar palabras"]')
        if (searchInput) {
          e.preventDefault()
          searchInput.focus()
          setSearchOpen(true)
        }
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown)
    return () => window.removeEventListener("keydown", handleGlobalKeyDown)
  }, [chapter, currentBook, selectedVerses, searchOpen])



  const [highlightedVerse, setHighlightedVerse] = useState<number | null>(null)
  const [currentVerse, setCurrentVerse] = useState<number>(1)

  // Scroll to highlighted verse when navigated from search
  useEffect(() => {
    if (highlightedVerse !== null) {
      // Small timeout to allow the new chapter's verses to render
      const timer = setTimeout(() => {
        const el = document.getElementById(`verse-${highlightedVerse}`)
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [highlightedVerse])

  // Navigate to a search result verse
  const goToSearchResult = useCallback((v: Verse) => {
    if (searchQuery) {
      saveSearch(searchQuery)
    }
    setBookId(Number(v.bookId))
    setChapter(Number(v.chapter))
    setCurrentVerse(Number(v.verse))
    setHighlightedVerse(Number(v.verse))
    setSearchOpen(false)
    setSearchQuery("")
    
    // Auto-clear highlight after 4 seconds
    setTimeout(() => {
      setHighlightedVerse(null)
    }, 4000)
  }, [searchQuery, saveSearch])

  const versesKey = bookId ? `/api/verses?bible=${bibleId}&book=${bookId}&chapter=${chapter}` : null
  const { data: versesData, isLoading: versesLoading } = useSWR<{ verses: Verse[] }>(
    versesKey,
    fetcher,
  )
  const verses = versesData?.verses ?? []

  // Register reading activity
  useEffect(() => {
    if (verses.length > 0 && bookId) {
      // Small timeout to simulate actual reading before registering
      const timer = setTimeout(() => {
        fetch("/api/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookId, chaptersCount: 1, versesCount: verses.length })
        }).catch(console.error)
      }, 5000) // 5 seconds in the chapter registers it

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

  // 2. Highlights fetch logic
  const highlightsKey = !isGuest && bookId && bibleId ? `/api/highlights?book=${bookId}&chapter=${chapter}&bibleId=${bibleId}` : null
  const { data: highlightsData, mutate: mutateHighlights } = useSWR<{ highlights: { verse: number; color: string }[] }>(
    highlightsKey,
    fetcher,
    { revalidateOnFocus: false }
  )
  const highlights = highlightsData?.highlights ?? []

  const highlightsByVerse = useMemo(() => {
    const map = new Map<number, string>()
    for (const h of highlights) {
      map.set(Number(h.verse), h.color)
    }
    return map
  }, [highlights])

  // Clear selection on navigation change
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

  const toggleVerseSelection = useCallback((verseNum: number, shiftKey?: boolean) => {
    setSelectedVerses(prev => {
      if (shiftKey && prev.length > 0) {
        let anchor = lastSelectedVerse !== null && prev.includes(lastSelectedVerse) ? lastSelectedVerse : prev[0]
        const start = Math.min(anchor, verseNum)
        const end = Math.max(anchor, verseNum)
        const range: number[] = []
        for (let i = start; i <= end; i++) {
          range.push(i)
        }
        const newSelection = Array.from(new Set([...prev, ...range])).sort((a, b) => a - b)
        setLastSelectedVerse(verseNum)
        return newSelection
      }

      setLastSelectedVerse(verseNum)
      if (prev.includes(verseNum)) {
        return prev.filter(x => x !== verseNum)
      } else {
        return [...prev, verseNum].sort((a, b) => a - b)
      }
    })
  }, [lastSelectedVerse])

  const formatVerseRange = useCallback((versesList: number[]) => {
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
  }, [])

  const handleCopySelection = useCallback(async () => {
    if (selectedVerses.length === 0) return
    const selectedVersesData = verses
      .filter(v => selectedVerses.includes(Number(v.verse)))
      .sort((a, b) => Number(a.verse) - Number(b.verse))

    if (selectedVersesData.length === 0) return

    const verseRangeStr = formatVerseRange(selectedVerses)
    const titleLine = `${currentBook?.bookName} ${chapter}:${verseRangeStr}:`

    // Format each verse text
    const bodyLines = selectedVersesData
      .map(v => `${v.verse}. ${v.text}`)
      .join("\n\n")

    const bibleAbbr = currentBible?.abbr || "RVR1960"
    const bibleIdVal = bibleId || 149

    const origin = typeof window !== "undefined" ? window.location.origin : "https://biblia2.dvguzman.com"
    const customUrl = buildBiblePassageUrl({
      origin,
      bibleId: bibleIdVal,
      bookId: Number(currentBook?.bookId) || 1,
      chapter,
      verseRange: verseRangeStr,
      bibleAbbr,
    })
    const footerLine = `${currentBook?.bookName.toUpperCase()} ${chapter}:${verseRangeStr}\n${customUrl}`

    const clipboardText = `${titleLine}\n\n${bodyLines}\n\n${footerLine}`

    try {
      await navigator.clipboard.writeText(clipboardText)
      alert("¡Versículos copiados al portapapeles con formato YouVersion!")
    } catch (err) {
      console.error("Error al copiar al portapapeles:", err)
      alert("No se pudo copiar al portapapeles.")
    }
  }, [selectedVerses, verses, currentBook, chapter, currentBible, bibleId, formatVerseRange])

  const handleHighlightSelection = useCallback(async (color: string | null) => {
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
      setSelectedVerses([]) // Clear selection after highlighting
    } catch (err) {
      console.error("Error al guardar destacados:", err)
      alert("No se pudo guardar el destacado.")
    }
  }, [selectedVerses, bookId, chapter, mutateHighlights])

  const handleFavoriteSelection = useCallback(async () => {
    if (selectedVerses.length === 0) return
    try {
      // Add each selected verse to favorites
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

  const highlightMatch = useCallback((text: string, query: string) => {
    if (!query || !query.trim()) return <span>{text}</span>
    const parts = text.split(new RegExp(`(${query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")})`, "gi"))
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-yellow-500/30 text-foreground dark:bg-yellow-500/40 rounded px-0.5 font-semibold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    )
  }, [])

  const handleShareSelection = useCallback(async () => {
    if (selectedVerses.length === 0) return
    const selectedVersesData = verses
      .filter(v => selectedVerses.includes(Number(v.verse)))
      .sort((a, b) => Number(a.verse) - Number(b.verse))
    
    if (selectedVersesData.length === 0) return

    const verseRangeStr = formatVerseRange(selectedVerses)
    const titleLine = `${currentBook?.bookName} ${chapter}:${verseRangeStr}:`
    
    const bodyLines = selectedVersesData
      .map(v => `${v.verse}. ${v.text}`)
      .join("\n\n")

    const bibleAbbr = currentBible?.abbr || "RVR1960"
    const bibleIdVal = bibleId || 149
    
    const origin = typeof window !== "undefined" ? window.location.origin : "https://biblia2.dvguzman.com"
    const customUrl = buildBiblePassageUrl({
      origin,
      bibleId: bibleIdVal,
      bookId: Number(currentBook?.bookId) || 1,
      chapter,
      verseRange: verseRangeStr,
      bibleAbbr,
    })
    const footerLine = `${currentBook?.bookName.toUpperCase()} ${chapter}:${verseRangeStr}\n${customUrl}`

    const shareText = `${titleLine}\n\n${bodyLines}\n\n${footerLine}`

    try {
      await navigator.share({
        title: `${currentBook?.bookName} ${chapter}:${verseRangeStr}`,
        text: shareText,
        url: customUrl
      })
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Error al compartir:", err)
        alert("No se pudo compartir el contenido.")
      }
    }
  }, [selectedVerses, verses, currentBook, chapter, currentBible, bibleId, formatVerseRange])

  const imageCreatorData = useMemo(() => {
    if (selectedVerses.length === 0) return null
    const selectedVersesData = verses
      .filter((v) => selectedVerses.includes(Number(v.verse)))
      .sort((a, b) => Number(a.verse) - Number(b.verse))
    if (selectedVersesData.length === 0) return null

    const verseRangeStr = formatVerseRange(selectedVerses)
    const text = selectedVersesData.map((v) => v.text).join(" ")
    const reference = `${currentBook?.bookName ?? "Biblia"} ${chapter}:${verseRangeStr}`

    return {
      text,
      reference,
      abbr: currentBible?.abbr || "RVR1960",
    }
  }, [selectedVerses, verses, currentBook, chapter, currentBible, formatVerseRange])

  function selectBook(value: string | null) {
    if (!value) return
    setBookId(Number(value))
    setChapter(1)
    setCurrentVerse(1)
    setActiveNoteId(null)
    setMobileMenuTab(null)
  }

  useEffect(() => {
    if (!bookId || books.length === 0) return
    const exists = books.some((b) => Number(b.bookId) === Number(bookId))
    if (!exists) {
      setBookId(Number(books[0].bookId))
      setChapter(1)
      setCurrentVerse(1)
    }
  }, [books, bookId])

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

  function selectBible(value: string | null) {
    if (!value) return
    setBibleId(Number(value))
    setActiveNoteId(null)
    setSearchQuery("")
    setSearchResults([])
    setHighlightedVerse(currentVerse)
    setMobileMenuTab(null)
  }

  async function handleVerseNote(v: Verse) {
    if (isGuest) {
      onLoginRequest?.()
      return
    }
    setSidebarTab("verses") // Auto switch to verse notes tab
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
  }

  function handleInsertVerseToNote(v: Verse) {
    if (!editingNotebookNote) return
    const quote = `\n> **${v.bookName} ${v.chapter}:${v.verse}** — ${v.text}\n\n`
    setEditingNotebookNote({
      ...editingNotebookNote,
      content: editingNotebookNote.content + quote,
    })
  }

  const chapterCount = currentBook ? Number(currentBook.chapters) : 0

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

  return (
    <div className="mx-auto flex max-w-none w-full flex-col gap-6 px-4 lg:px-6 py-6 lg:flex-row lg:items-start">
      {/* Reading column */}
      <section className={cn("flex-1 min-w-0", layoutMode === "notebook" && "hidden")}>
        <div className="sticky top-2 z-30 mb-3 md:mb-5 rounded-xl border border-border/70 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 p-2 md:p-4">
          <div className="flex flex-col gap-2 md:gap-3">
            {/* Minimal Header Row for Mobile */}
            <div className="flex md:hidden items-center justify-between w-full border-b border-border/40 pb-2 mb-1">
              {/* Passage reference button */}
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

              {/* Quick action buttons */}
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

            <div className={cn(
              "flex-wrap items-end gap-3",
              mobileMenuTab === "selectors" ? "flex" : "hidden md:flex"
            )}>
              <div className="min-w-[230px] flex-1 md:flex-none">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Versión</p>
                <Select value={String(bibleId)} onValueChange={selectBible}>
                  <SelectTrigger className="w-full md:w-72">
                    <span className="truncate text-sm">
                      {currentBible ? `${currentBible.abbr} · ${currentBible.name}` : "Elige versión"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {bibles.map((b) => (
                      <SelectItem key={b.bibleId} value={String(b.bibleId)}>
                        {b.abbr} · {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-[190px] flex-1 md:flex-none">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Libro</p>
                <Select value={bookId ? String(bookId) : ""} onValueChange={selectBook}>
                  <SelectTrigger className="w-full md:w-56">
                    <span className="truncate text-sm">
                      {currentBook ? currentBook.bookName : "Elige un libro"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {books.map((b) => (
                      <SelectItem key={b.bookId} value={String(b.bookId)}>
                        {b.bookName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {currentBook && (
                <div className="flex items-end gap-1.5">
                  <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Capítulo</p>
                    <Select value={String(chapter)} onValueChange={(v) => {
                      if (v) {
                        setChapter(Number(v))
                        setMobileMenuTab(null)
                      }
                    }}>
                      <SelectTrigger className="w-36">
                        <span className="truncate text-sm">Capítulo {chapter}</span>
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: chapterCount }, (_, i) => i + 1).map((c) => (
                          <SelectItem key={c} value={String(c)}>
                            Capítulo {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={chapter <= 1}
                      onClick={() => {
                        setChapter((c) => Math.max(1, c - 1))
                        setMobileMenuTab(null)
                      }}
                      aria-label="Capítulo anterior"
                      className="cursor-pointer"
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={chapter >= chapterCount}
                      onClick={() => {
                        setChapter((c) => Math.min(chapterCount, c + 1))
                        setMobileMenuTab(null)
                      }}
                      aria-label="Capítulo siguiente"
                      className="cursor-pointer"
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
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

            <div className={cn(
              "flex-wrap items-end justify-between gap-3",
              (mobileMenuTab === "search" || mobileMenuTab === "settings") ? "flex" : "hidden md:flex"
            )}>
              <div className={cn(
                "min-w-[220px] flex-1 md:max-w-sm",
                mobileMenuTab === "search" ? "block" : "hidden md:block"
              )} ref={searchRef}>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Buscar</p>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar palabras o pasajes (p. ej. 1 Pedro 5)..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setSearchOpen(true)
                    }}
                    onFocus={() => setSearchOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && searchResults.length > 0) {
                        goToSearchResult(searchResults[0])
                      }
                    }}
                    className="w-full rounded-md border border-input bg-background pl-9 pr-8 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery("")
                        setSearchResults([])
                      }}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Limpiar búsqueda"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>

                {searchOpen && (
                  <div className="absolute left-0 right-0 z-50 mt-1 max-h-96 overflow-y-auto rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-md">
                    {searchQuery.trim().length < 2 ? (
                      recentSearches.length > 0 ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-muted-foreground border-b border-border/40 pb-1.5 mb-1">
                            <span>Búsquedas recientes</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setRecentSearches([])
                                localStorage.removeItem("recent_searches")
                              }}
                              className="text-[10px] hover:text-destructive hover:underline cursor-pointer"
                            >
                              Limpiar
                            </button>
                          </div>
                          {recentSearches.map((term, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between group rounded hover:bg-accent hover:text-accent-foreground transition-colors px-2 py-1 text-xs"
                            >
                              <button
                                onClick={() => {
                                  setSearchQuery(term)
                                  setSearchOpen(true)
                                }}
                                className="flex-1 text-left py-1 text-foreground cursor-pointer"
                              >
                                {term}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setRecentSearches(prev => {
                                    const updated = prev.filter(t => t !== term)
                                    localStorage.setItem("recent_searches", JSON.stringify(updated))
                                    return updated
                                  })
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive text-muted-foreground transition-opacity cursor-pointer"
                                title="Eliminar"
                              >
                                <X className="size-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 text-center text-xs text-muted-foreground">
                          Escribe para buscar pasajes o palabras.
                        </div>
                      )
                    ) : (
                      searchLoading ? (
                        <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Buscando...
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No se encontraron resultados.
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                            {searchResults.length} resultados
                          </div>
                          {searchResults.map((v) => (
                            <button
                              key={`${v.id}-${v.bookId}-${v.chapter}-${v.verse}`}
                              onClick={() => goToSearchResult(v)}
                              className="w-full text-left rounded px-2 py-1.5 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                            >
                              <span className="font-semibold text-primary block text-xs">
                                {v.bookName} {v.chapter}:{v.verse}
                              </span>
                              <span className="line-clamp-2 text-xs text-muted-foreground mt-0.5">
                                {highlightMatch(v.text, searchQuery)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

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
          {verses.map((v) => {
            const hasNote = linksByVerse.has(Number(v.verse))
            const highlightColor = highlightsByVerse.get(Number(v.verse))
            const isSelected = selectedVerses.includes(Number(v.verse))
            return (
              <li
                key={v.id}
                id={`verse-${v.verse}`}
                onClick={() => setCurrentVerse(Number(v.verse))}
                draggable={true}
                onDragStart={(e) => {
                  const verseText = `${v.bookName} ${v.chapter}:${v.verse} — ${v.text}`
                  e.dataTransfer.setData("text/plain", verseText)
                  e.dataTransfer.effectAllowed = "copy"
                }}
                className={cn(
                  "group flex gap-3 rounded-md px-3 py-2 transition-all duration-300 hover:bg-accent/40 cursor-grab active:cursor-grabbing",
                  hasNote && "bg-accent/30",
                  highlightColor === "yellow" && "bg-yellow-500/10 dark:bg-yellow-500/20 border-l-4 border-yellow-500 rounded-l-none pl-2",
                  highlightColor === "green" && "bg-emerald-500/10 dark:bg-emerald-500/20 border-l-4 border-emerald-500 rounded-l-none pl-2",
                  highlightColor === "blue" && "bg-sky-500/10 dark:bg-sky-500/20 border-l-4 border-sky-500 rounded-l-none pl-2",
                  highlightColor === "orange" && "bg-orange-500/10 dark:bg-orange-500/20 border-l-4 border-orange-500 rounded-l-none pl-2",
                  highlightColor === "pink" && "bg-pink-500/10 dark:bg-pink-500/20 border-l-4 border-pink-500 rounded-l-none pl-2",
                  isSelected && "ring-2 ring-primary bg-primary/5 dark:bg-primary/10",
                  highlightedVerse === Number(v.verse) && "bg-yellow-500/15 dark:bg-yellow-500/10 ring-2 ring-yellow-500/80 scale-[1.01] shadow-sm",
                )}
              >
                <span
                  className="mt-1.5 select-none font-medium text-primary tabular-nums cursor-pointer hover:underline"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleVerseSelection(Number(v.verse), e.shiftKey)
                  }}
                  style={{ fontSize: `${Math.max(12, fontSize - 6)}px` }}
                >
                  {v.verse}
                </span>
                <p
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleVerseSelection(Number(v.verse), e.shiftKey)
                    setCurrentVerse(Number(v.verse))
                  }}
                  className="flex-1 font-serif leading-relaxed text-foreground cursor-pointer select-none"
                  style={{ fontSize: `${fontSize}px` }}
                >
                  {v.text}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  {editingNotebookNote && (
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleInsertVerseToNote(v)
                      }}
                      draggable={false}
                      title="Insertar versículo en la nota de cuaderno activa"
                      aria-label="Insertar versículo"
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 transition-colors"
                    >
                      <Plus className="size-4 font-bold" />
                    </button>
                  )}
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleVerseNote(v)
                    }}
                    draggable={false}
                    disabled={creating === Number(v.verse)}
                    aria-label={isGuest ? "Inicia sesión para añadir nota" : hasNote ? "Ver nota" : "Añadir nota"}
                    className={cn(
                      "inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors",
                      isGuest
                        ? "text-muted-foreground/60 hover:text-primary hover:bg-primary/10"
                        : hasNote
                          ? "text-primary hover:bg-primary/10"
                          : "text-muted-foreground/80 hover:text-foreground hover:bg-accent",
                    )}
                  >
                    {isGuest ? <FileText className="size-4" /> : hasNote ? <FileText className="size-4" /> : <Plus className="size-4" />}
                  </button>
                </div>
              </li>
            )
          })}
        </ol>

        {/* Bottom Chapter Navigation */}
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

      {/* Sidebar Panel */}
      {!isGuest && (
      <aside className={cn(
        "min-w-0 w-full self-start lg:sticky lg:top-2",
        layoutMode === "bible" && "hidden",
        layoutMode === "notebook" ? "w-full" : "lg:flex-1"
      )}>
        {/* Render Layout Switcher at the top when in Solo Cuaderno mode */}
        {layoutMode === "notebook" && (
          <div className="mb-4 flex justify-end">
            {renderLayoutSwitcher()}
          </div>
        )}

        <div className={cn(
          "flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm",
          layoutMode === "notebook" ? "h-[calc(100vh-1rem)]" : "h-[calc(100vh-1rem)]"
        )}>
          {/* Tab Switcher */}
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

      {/* Floating Selection Toolbar */}
      {selectedVerses.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background/85 backdrop-blur-md border border-border shadow-2xl rounded-full px-3 py-2 sm:px-5 sm:py-2.5 flex items-center gap-2 sm:gap-3.5 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="hidden sm:flex flex-col min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-none mb-0.5">Selección</span>
            <span className="text-xs font-bold text-foreground truncate max-w-[150px] md:max-w-[200px]">
              {currentBook?.bookName} {chapter}:{formatVerseRange(selectedVerses)}
            </span>
          </div>
          <div className="flex sm:hidden flex-col min-w-0 max-w-[70px]">
            <span className="text-[10px] font-bold text-foreground truncate">
              {currentBook ? (bookAbbrMap[Number(currentBook.bookId)] || currentBook.bookName) : ""} {chapter}:{formatVerseRange(selectedVerses)}
            </span>
          </div>

          <div className="w-[1px] h-5 sm:h-6 bg-border" />

          {isGuest ? (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={handleCopySelection}
                className="h-8 rounded-full text-xs font-semibold px-2 sm:px-3 gap-1 shadow-sm cursor-pointer"
              >
                <Copy className="size-3.5" />
                <span className="hidden sm:inline">Copiar</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onLoginRequest?.()}
                className="h-8 rounded-full text-xs font-semibold px-3 gap-1 shadow-sm cursor-pointer"
              >
                <FileText className="size-3.5" />
                <span>Iniciar sesión</span>
              </Button>
            </>
          ) : (
          <>
          {/* Color palette */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={() => handleHighlightSelection("yellow")}
              className="size-4 sm:size-5 rounded-full bg-yellow-400 border border-yellow-500/20 hover:scale-115 active:scale-90 transition-transform cursor-pointer"
              title="Destacar Amarillo"
            />
            <button
              onClick={() => handleHighlightSelection("green")}
              className="size-4 sm:size-5 rounded-full bg-emerald-400 border border-emerald-500/20 hover:scale-115 active:scale-90 transition-transform cursor-pointer"
              title="Destacar Verde"
            />
            <button
              onClick={() => handleHighlightSelection("blue")}
              className="size-4 sm:size-5 rounded-full bg-sky-400 border border-sky-500/20 hover:scale-115 active:scale-90 transition-transform cursor-pointer"
              title="Destacar Azul"
            />
            <button
              onClick={() => handleHighlightSelection("orange")}
              className="size-4 sm:size-5 rounded-full bg-orange-400 border border-orange-500/20 hover:scale-115 active:scale-90 transition-transform cursor-pointer"
              title="Destacar Naranja"
            />
            <button
              onClick={() => handleHighlightSelection("pink")}
              className="size-4 sm:size-5 rounded-full bg-pink-400 border border-pink-500/20 hover:scale-115 active:scale-90 transition-transform cursor-pointer"
              title="Destacar Rosa"
            />
            
            {/* Clear highlight button */}
            <button
              onClick={() => handleHighlightSelection(null)}
              className="size-4 sm:size-5 rounded-full border border-border bg-background hover:bg-muted flex items-center justify-center hover:scale-115 active:scale-90 transition-transform cursor-pointer"
              title="Quitar Destacado"
            >
              <X className="size-3 text-muted-foreground" />
            </button>
          </div>

          <div className="w-[1px] h-5 sm:h-6 bg-border" />

          {/* Action buttons */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            {canShare && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareSelection}
                className="h-8 rounded-full text-xs font-semibold px-2 sm:px-3 gap-1 shadow-sm border-primary/20 hover:bg-primary/5 hover:text-primary cursor-pointer"
              >
                <Share2 className="size-3.5" />
                <span className="hidden sm:inline">Compartir</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImageCreatorOpen(true)}
              disabled={!imageCreatorData}
              className="h-8 rounded-full text-xs font-semibold px-2 sm:px-3 gap-1 shadow-sm border-primary/20 hover:bg-primary/5 hover:text-primary cursor-pointer"
            >
              <ImageIcon className="size-3.5" />
              <span className="hidden sm:inline">Imagen</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleCopySelection}
              className="h-8 rounded-full text-xs font-semibold px-2 sm:px-3 gap-1 shadow-sm cursor-pointer"
            >
              <Copy className="size-3.5" />
              <span className="hidden sm:inline">Copiar</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleFavoriteSelection}
              className="h-8 rounded-full text-amber-500 hover:text-amber-600 hover:bg-amber-50 border-amber-200 text-xs font-semibold px-2 sm:px-3 gap-1 shadow-sm cursor-pointer"
            >
              <Star className="size-3.5 fill-amber-500/20" />
              <span className="hidden sm:inline">Favorito</span>
            </Button>
          </div>
          </>
          )}
          <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedVerses([])}
              className="h-7 w-7 sm:h-8 sm:w-8 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
              title="Cancelar selección"
            >
              <X className="size-4" />
            </Button>
        </div>
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
