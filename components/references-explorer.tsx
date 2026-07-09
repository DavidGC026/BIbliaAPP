"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Loader2, Link as LinkIcon, BookOpen, AlertCircle, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { ReferencesRainbowMap } from "@/components/references-rainbow-map"

interface BibleBook {
  bookId: number
  bookName: string
  chapters?: number
}

interface BibleVersion {
  bibleId: number
  abbr: string
  name: string
}

interface VerseRef {
  book_name: string
  book_id: number
  chapter: number
  verse: number
  text: string
  votos: number
}

export function ReferencesExplorer() {
  const [view, setView] = useState<"list" | "map">("list")
  const { data: biblesData } = useSWR<{ bibles: BibleVersion[] }>("/api/bibles", fetcher)
  const bibles = biblesData?.bibles || []
  
  const [selectedBibleId, setSelectedBibleId] = useState<number>(149)
  const { data: booksData, isLoading: isLoadingBooks } = useSWR<{ books: BibleBook[] }>(`/api/books?bible=${selectedBibleId}`, fetcher)
  
  const [selectedBook, setSelectedBook] = useState<number>(1)
  const [selectedChapter, setSelectedChapter] = useState<number>(1)
  const [selectedVerse, setSelectedVerse] = useState<number>(1)
  
  // Para los dropdowns podríamos cargar el número de capítulos y versículos dinámicamente,
  // pero para mantenerlo simple asumiremos un máximo estándar y permitiremos que el usuario introduzca números.
  
  const { data: refsData, isLoading: isLoadingRefs, error } = useSWR<{ references: VerseRef[] }>(
    `/api/references?bookId=${selectedBook}&chapter=${selectedChapter}&verse=${selectedVerse}&bible=${selectedBibleId}`,
    fetcher
  )

  const { data: chapterData } = useSWR<{ verses: { verse: number; text: string }[] }>(
    `/api/verses?bible=${selectedBibleId}&book=${selectedBook}&chapter=${selectedChapter}`,
    fetcher
  )

  const books = booksData?.books || []
  const references = refsData?.references || []
  
  const sourceVerseText = chapterData?.verses?.find(v => Number(v.verse) === selectedVerse)?.text
  const selectedBookName = books.find(b => b.bookId === selectedBook)?.bookName

  if (view === "map") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background animate-fade-in">
        <header className="flex items-center gap-3 border-b border-border px-4 py-2 shrink-0">
          <button
            type="button"
            onClick={() => setView("list")}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            Volver
          </button>
          <h1 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
            <span aria-hidden>🌈</span>
            Mapa de referencias
          </h1>
          <p className="hidden text-xs text-muted-foreground md:block">
            Cada arco conecta dos capítulos que se citan entre sí · rueda o pellizco para zoom · arrastra para moverte · clic en un capítulo para ver sus conexiones
          </p>
        </header>
        <div className="min-h-0 flex-1">
          <ReferencesRainbowMap />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <LinkIcon className="size-6 text-primary" />
            Referencias Cruzadas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Explora las conexiones de la Biblia mediante índices temáticos universales.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setView("map")}
        className="w-full flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left shadow-sm hover:bg-accent/40 transition-colors"
      >
        <span className="text-xl" aria-hidden>🌈</span>
        <span className="flex-1">
          <span className="block font-semibold text-foreground">Mapa de referencias</span>
          <span className="block text-xs text-muted-foreground">Toda la Biblia en un vistazo</span>
        </span>
      </button>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Versión</label>
            <select
              className="w-full bg-background border border-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
              value={selectedBibleId}
              onChange={(e) => setSelectedBibleId(Number(e.target.value))}
            >
              {bibles.map(b => (
                <option key={b.bibleId} value={b.bibleId}>{b.name} ({b.abbr})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Libro</label>
            <select
              className="w-full bg-background border border-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
              value={selectedBook}
              onChange={(e) => {
                setSelectedBook(Number(e.target.value))
                setSelectedChapter(1)
                setSelectedVerse(1)
              }}
              disabled={isLoadingBooks}
            >
              {books.map(b => (
                <option key={b.bookId} value={b.bookId}>{b.bookName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Capítulo</label>
            <input
              type="number"
              min="1"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Versículo</label>
            <input
              type="number"
              min="1"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
              value={selectedVerse}
              onChange={(e) => setSelectedVerse(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Source Verse Display */}
        {sourceVerseText && (
          <div className="mb-8 p-4 bg-primary/5 rounded-xl border border-primary/10">
            <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
              <BookOpen className="size-4" />
              Versículo a comparar ({selectedBookName} {selectedChapter}:{selectedVerse})
            </h3>
            <p className="text-foreground/90 font-medium italic text-lg">"{sourceVerseText}"</p>
          </div>
        )}

        <div>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            Resultados ({references.length})
            {isLoadingRefs && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          </h3>

          {error && (
            <div className="flex items-center gap-2 text-destructive p-4 bg-destructive/10 rounded-lg">
              <AlertCircle className="size-5" />
              <p>Ocurrió un error al cargar las referencias.</p>
            </div>
          )}

          {!isLoadingRefs && references.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center text-center py-16 text-muted-foreground">
              <BookOpen className="size-12 opacity-20 mb-3" />
              <p className="text-lg font-medium">No se encontraron referencias</p>
              <p className="text-sm mt-1 max-w-md">
                No hay referencias cruzadas guardadas para este versículo o aún no has importado el diccionario base de datos de referencias.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {references.map((ref, idx) => (
              <div key={idx} className="group relative bg-background border border-border/60 rounded-xl p-4 hover:border-border transition-colors shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-primary/10 text-primary">
                    {ref.book_name} {ref.chapter}:{ref.verse}
                  </span>
                  {ref.votos > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {ref.votos} votos de relevancia
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed font-serif">
                  "{ref.text}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
