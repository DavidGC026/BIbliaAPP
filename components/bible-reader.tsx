"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
import type { Book, Verse, NoteLink, BibleVersion } from "@/lib/types"
import { NotePanel } from "./note-panel"
import { NotebookSidebar } from "./notebook-sidebar"
import { FileText, Plus, ChevronLeft, ChevronRight, Search, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function BibleReader() {
  const { data: biblesData } = useSWR<{ bibles: BibleVersion[] }>("/api/bibles", fetcher)
  const bibles = biblesData?.bibles ?? []
  const [bibleId, setBibleId] = useState<number>(149)
  const { data: booksData } = useSWR<{ books: Book[] }>(
    bibleId ? `/api/books?bible=${bibleId}` : null,
    fetcher,
  )
  const books = booksData?.books ?? []

  const [bookId, setBookId] = useState<number | null>(null)
  const [chapter, setChapter] = useState(1)
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [activeRef, setActiveRef] = useState<string | null>(null)
  const [creating, setCreating] = useState<number | null>(null)

  // Sidebar Tab, Notebook Editing and Layout states
  const [sidebarTab, setSidebarTab] = useState<"verses" | "notebooks">("verses")
  const [editingNotebookNote, setEditingNotebookNote] = useState<{ id: number; title: string; content: string } | null>(null)
  const [layoutMode, setLayoutMode] = useState<"split" | "bible" | "notebook">("split")

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

  const currentBook = useMemo(
    () => books.find((b) => Number(b.bookId) === bookId) ?? null,
    [books, bookId],
  )
  const currentBible = useMemo(
    () => bibles.find((b) => Number(b.bibleId) === bibleId) ?? null,
    [bibles, bibleId],
  )

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
  }, [])

  const versesKey = bookId ? `/api/verses?bible=${bibleId}&book=${bookId}&chapter=${chapter}` : null
  const { data: versesData, isLoading: versesLoading } = useSWR<{ verses: Verse[] }>(
    versesKey,
    fetcher,
  )
  const verses = versesData?.verses ?? []

  const linksKey = bookId ? `/api/links?book=${bookId}&chapter=${chapter}` : null
  const { data: linksData, mutate: mutateLinks } = useSWR<{ links: NoteLink[] }>(
    linksKey,
    fetcher,
  )
  const linksByVerse = useMemo(() => {
    const map = new Map<number, NoteLink>()
    for (const l of linksData?.links ?? []) map.set(Number(l.verse), l)
    return map
  }, [linksData])

  function selectBook(value: string | null) {
    if (!value) return
    setBookId(Number(value))
    setChapter(1)
    setCurrentVerse(1)
    setActiveNoteId(null)
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
  }

  async function handleVerseNote(v: Verse) {
    setSidebarTab("verses") // Auto switch to verse notes tab
    const existing = linksByVerse.get(Number(v.verse))
    if (existing) {
      setActiveNoteId(existing.joplinNoteId)
      setActiveRef(`${v.bookName} ${v.chapter}:${v.verse}`)
      return
    }
    setCreating(Number(v.verse))
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("joplin_token") : null
      const res = await fetch("/api/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-joplin-token": token } : {}),
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
      if (!res.ok) throw new Error(data.error)
      await mutateLinks()
      setActiveNoteId(data.joplinNoteId)
      setActiveRef(`${v.bookName} ${v.chapter}:${v.verse}`)
    } catch (e) {
      const message = e instanceof Error ? e.message : "No se pudo crear la nota"
      if (message.includes("401") || message.includes("403")) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("joplin_token")
        }
        alert("Tu sesión de Joplin expiró. Vuelve a iniciar sesión en el panel derecho.")
      } else {
        alert(message)
      }
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
    </div>
  )

  return (
    <div className="mx-auto flex max-w-none w-full flex-col gap-6 px-4 lg:px-6 py-6 lg:flex-row lg:items-start">
      {/* Reading column */}
      <section className={cn("flex-1 min-w-0", layoutMode === "notebook" && "hidden")}>
        <div className="sticky top-2 z-30 mb-5 rounded-xl border border-border/70 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 p-3 md:p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end gap-3">
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
                    <Select value={String(chapter)} onValueChange={(v) => v && setChapter(Number(v))}>
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
                      onClick={() => setChapter((c) => Math.max(1, c - 1))}
                      aria-label="Capítulo anterior"
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={chapter >= chapterCount}
                      onClick={() => setChapter((c) => Math.min(chapterCount, c + 1))}
                      aria-label="Capítulo siguiente"
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-[220px] flex-1 md:max-w-sm" ref={searchRef}>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Buscar</p>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar palabras..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setSearchOpen(true)
                    }}
                    onFocus={() => setSearchOpen(true)}
                    className="w-full rounded-md border border-input bg-background pl-9 pr-8 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery("")
                        setSearchResults([])
                      }}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                      title="Limpiar búsqueda"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>

                {searchOpen && (searchQuery.trim().length >= 2) && (
                  <div className="absolute left-0 right-0 z-50 mt-1 max-h-96 overflow-y-auto rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-md">
                    {searchLoading ? (
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
                            className="w-full text-left rounded px-2 py-1.5 hover:bg-accent hover:text-accent-foreground transition-colors"
                          >
                            <span className="font-semibold text-primary block text-xs">
                              {v.bookName} {v.chapter}:{v.verse}
                            </span>
                            <span className="line-clamp-2 text-xs text-muted-foreground mt-0.5">
                              {v.text}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
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
            return (
              <li
                key={v.id}
                id={`verse-${v.verse}`}
                onClick={() => setCurrentVerse(Number(v.verse))}
                className={cn(
                  "group flex gap-3 rounded-md px-3 py-2 transition-all duration-300 hover:bg-accent/40",
                  hasNote && "bg-accent/30",
                  highlightedVerse === Number(v.verse) && "bg-yellow-500/15 dark:bg-yellow-500/10 ring-2 ring-yellow-500/80 scale-[1.01] shadow-sm",
                )}
              >
                <span className="mt-1 select-none text-xs font-medium text-primary tabular-nums">
                  {v.verse}
                </span>
                <p className="flex-1 font-serif text-lg leading-relaxed text-foreground">
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
                    aria-label={hasNote ? "Ver nota" : "Añadir nota"}
                    className={cn(
                      "inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors",
                      hasNote
                        ? "text-primary hover:bg-primary/10"
                        : "text-muted-foreground/80 hover:text-foreground hover:bg-accent",
                    )}
                  >
                    {hasNote ? <FileText className="size-4" /> : <Plus className="size-4" />}
                  </button>
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      {/* Sidebar Panel */}
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
          <div className="flex border-b border-border bg-muted/20">
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

          <div className="flex-1 overflow-hidden">
            {sidebarTab === "verses" ? (
              <NotePanel
                noteId={activeNoteId}
                reference={activeRef}
                onClose={() => setActiveNoteId(null)}
              />
            ) : (
              <NotebookSidebar
                editingNote={editingNotebookNote}
                setEditingNote={(note) => {
                  setEditingNotebookNote(note)
                  if (note) setSidebarTab("notebooks")
                }}
              />
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}
