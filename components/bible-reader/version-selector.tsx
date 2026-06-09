"use client"

import { memo } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import type { BibleVersion, Book } from "@/lib/types"

export interface VersionSelectorProps {
  bibles: BibleVersion[]
  currentBible: BibleVersion | null
  bibleId: number
  isLoading: boolean
  onChange: (value: string | null) => void
}

/** Dropdown de versiones bíblicas con estado de carga. */
export const VersionSelector = memo(function VersionSelector({
  bibles,
  currentBible,
  bibleId,
  isLoading,
  onChange,
}: VersionSelectorProps) {
  return (
    <div className="min-w-[230px] flex-1 md:flex-none">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Versión</p>
      <Select value={String(bibleId)} onValueChange={onChange}>
        <SelectTrigger className="w-full md:w-72">
          {isLoading ? (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Cargando versiones...
            </span>
          ) : (
            <span className="truncate text-sm">
              {currentBible ? `${currentBible.abbr} · ${currentBible.name}` : "Elige versión"}
            </span>
          )}
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
  )
})

export interface BookSelectorProps {
  books: Book[]
  currentBook: Book | null
  bookId: number | null
  onChange: (value: string | null) => void
}

/** Dropdown de libros de la versión activa. */
export const BookSelector = memo(function BookSelector({
  books,
  currentBook,
  bookId,
  onChange,
}: BookSelectorProps) {
  return (
    <div className="min-w-[190px] flex-1 md:flex-none">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Libro</p>
      <Select value={bookId ? String(bookId) : ""} onValueChange={onChange}>
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
  )
})

export interface ChapterSelectorProps {
  chapter: number
  chapterCount: number
  onChange: (chapter: number) => void
}

/** Dropdown de capítulo + botones anterior/siguiente. */
export const ChapterSelector = memo(function ChapterSelector({
  chapter,
  chapterCount,
  onChange,
}: ChapterSelectorProps) {
  return (
    <div className="flex items-end gap-1.5">
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Capítulo</p>
        <Select
          value={String(chapter)}
          onValueChange={(v) => {
            if (v) onChange(Number(v))
          }}
        >
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
          onClick={() => onChange(Math.max(1, chapter - 1))}
          aria-label="Capítulo anterior"
          className="cursor-pointer"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          disabled={chapter >= chapterCount}
          onClick={() => onChange(Math.min(chapterCount, chapter + 1))}
          aria-label="Capítulo siguiente"
          className="cursor-pointer"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
})
