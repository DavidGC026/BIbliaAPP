"use client"

import { useMemo, useState } from "react"
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
import type { Book, Verse, NoteLink } from "@/lib/types"
import { NotePanel } from "./note-panel"
import { FileText, Plus, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export function BibleReader() {
  const { data: booksData } = useSWR<{ books: Book[] }>("/api/books", fetcher)
  const books = booksData?.books ?? []

  const [bookId, setBookId] = useState<number | null>(null)
  const [chapter, setChapter] = useState(1)
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [activeRef, setActiveRef] = useState<string | null>(null)
  const [creating, setCreating] = useState<number | null>(null)

  const currentBook = useMemo(
    () => books.find((b) => Number(b.bookId) === bookId) ?? null,
    [books, bookId],
  )

  const versesKey = bookId ? `/api/verses?book=${bookId}&chapter=${chapter}` : null
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

  function selectBook(value: string) {
    setBookId(Number(value))
    setChapter(1)
    setActiveNoteId(null)
  }

  async function handleVerseNote(v: Verse) {
    const existing = linksByVerse.get(Number(v.verse))
    if (existing) {
      setActiveNoteId(existing.joplinNoteId)
      setActiveRef(`${v.bookName} ${v.chapter}:${v.verse}`)
      return
    }
    setCreating(Number(v.verse))
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      alert(e instanceof Error ? e.message : "No se pudo crear la nota")
    } finally {
      setCreating(null)
    }
  }

  const chapterCount = currentBook ? Number(currentBook.chapters) : 0

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 lg:flex-row">
      {/* Reading column */}
      <section className="flex-1">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Select value={bookId ? String(bookId) : ""} onValueChange={selectBook}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Elige un libro" />
            </SelectTrigger>
            <SelectContent>
              {books.map((b) => (
                <SelectItem key={b.bookId} value={String(b.bookId)}>
                  {b.bookName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {currentBook && (
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
              <Select value={String(chapter)} onValueChange={(v) => setChapter(Number(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: chapterCount }, (_, i) => i + 1).map((c) => (
                    <SelectItem key={c} value={String(c)}>
                      Capítulo {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          )}
        </div>

        {!bookId && (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            <p className="text-pretty leading-relaxed">
              Selecciona un libro para comenzar a leer la Biblia Reina Valera 1960.
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
                className={cn(
                  "group flex gap-3 rounded-md px-3 py-2 transition-colors hover:bg-accent/40",
                  hasNote && "bg-accent/30",
                )}
              >
                <span className="mt-1 select-none text-xs font-medium text-primary tabular-nums">
                  {v.verse}
                </span>
                <p className="flex-1 font-serif text-lg leading-relaxed text-foreground">
                  {v.text}
                </p>
                <button
                  onClick={() => handleVerseNote(v)}
                  disabled={creating === Number(v.verse)}
                  aria-label={hasNote ? "Ver nota" : "Añadir nota"}
                  className={cn(
                    "mt-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors",
                    hasNote
                      ? "text-primary hover:bg-primary/10"
                      : "text-muted-foreground opacity-0 hover:bg-accent group-hover:opacity-100",
                  )}
                >
                  {hasNote ? <FileText className="size-4" /> : <Plus className="size-4" />}
                </button>
              </li>
            )
          })}
        </ol>
      </section>

      {/* Note panel */}
      <aside className="lg:w-96 lg:shrink-0">
        <div className="sticky top-4 h-[70vh] overflow-hidden rounded-lg border border-border bg-card">
          <NotePanel
            noteId={activeNoteId}
            reference={activeRef}
            onClose={() => setActiveNoteId(null)}
          />
        </div>
      </aside>
    </div>
  )
}
