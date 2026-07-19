"use client"

import * as React from "react"
import { useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import {
  Search,
  BookOpen,
  Loader2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  History,
  X
} from "lucide-react"
import {
  addSearchHistory,
  clearSearchHistory,
  loadSearchHistory,
  removeSearchHistory,
} from "@/lib/search-history"

interface BibleVersion {
  bibleId: number
  abbr: string
  name: string
}

interface VerseResult {
  id: number
  bookId: number
  bookName: string
  chapter: number
  verse: number
  text: string
}

interface SearchAdvancedProps {
  onSelectVerse: (bookId: number, chapter: number, verse: number, bibleId?: number) => void
}

export function SearchAdvanced({ onSelectVerse }: SearchAdvancedProps) {
  // Fetch Bible Versions
  const { data: biblesData } = useSWR<{ bibles: BibleVersion[] }>("/api/bibles", fetcher)
  const bibles = biblesData?.bibles ?? []

  const [bibleId, setBibleId] = useState<string>("")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<VerseResult[]>([])
  const [isReference, setIsReference] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [history, setHistory] = useState<string[]>([])

  React.useEffect(() => {
    setHistory(loadSearchHistory())
  }, [])

  // Set default bible when loaded
  React.useEffect(() => {
    if (bibles.length > 0 && !bibleId) {
      // Prioritize RVR1960 or use first available
      const rvr = bibles.find(b => b.abbr.toLowerCase().includes("1960"))
      setBibleId(String(rvr ? rvr.bibleId : bibles[0].bibleId))
    }
  }, [bibles, bibleId])

  async function runSearch(rawTerm: string) {
    const term = rawTerm.trim()
    if (!term || term.length < 2) {
      setError("Por favor escribe al menos 2 caracteres.")
      return
    }

    setLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      const res = await fetch(`/api/search?bible=${bibleId}&q=${encodeURIComponent(term)}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Error al realizar la búsqueda")
      }

      setResults(data.verses || [])
      setIsReference(data.isReference || false)
      setHistory(addSearchHistory(term))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal")
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    void runSearch(query)
  }

  // Highlight search term in text
  function highlightText(text: string, search: string) {
    if (!search || isReference) return text // don't highlight references unless searching direct text

    // Escape regex characters
    const escapedSearch = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
    const regex = new RegExp(`(${escapedSearch})`, 'gi')
    
    const parts = text.split(regex)
    return (
      <>
        {parts.map((part, i) => 
          regex.test(part) ? (
            <mark key={i} className="bg-primary/20 text-foreground font-semibold rounded px-0.5">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    )
  }

  return (
    <div className="space-y-6 p-1 md:p-4 animate-fade-in">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          Buscar en la Biblia <Search className="size-6 text-primary" />
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Encuentra versículos por palabras clave o busca referencias directas.
        </p>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSearch} className="space-y-4 max-w-4xl">
        <div className="flex flex-col gap-3 sm:flex-row">
          
          {/* Selector de Biblia */}
          <div className="w-full sm:w-56 shrink-0">
            <Select value={bibleId} onValueChange={(val) => val && setBibleId(val)}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Versión" />
              </SelectTrigger>
              <SelectContent>
                {bibles.map((b) => (
                  <SelectItem key={b.bibleId} value={String(b.bibleId)}>
                    {b.abbr} - {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Input de Búsqueda */}
          <div className="relative flex-1">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ej: 'amor', 'salmo 23', 'juan 3:16-18' o link de YouVersion"
              className="h-10 pr-10"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-3 text-xs text-muted-foreground hover:text-foreground"
              >
                Limpiar
              </button>
            )}
          </div>

          <Button type="submit" disabled={loading} className="h-10 px-6 gap-2">
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Search className="size-4" />
                <span>Buscar</span>
              </>
            )}
          </Button>

        </div>

        {/* Tips de ayuda */}
        <div className="rounded-lg bg-accent/30 px-3.5 py-2.5 text-xs text-muted-foreground flex items-start gap-2">
          <HelpCircle className="size-4 text-primary shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-foreground">Tipos de búsquedas admitidas:</span>
            <ul className="list-disc pl-4 mt-1 space-y-0.5">
              <li><strong>Por palabra clave:</strong> Busca términos como <code className="bg-muted px-1 py-0.25 rounded text-[10px]">gracia</code>, <code className="bg-muted px-1 py-0.25 rounded text-[10px]">fe</code> o <code className="bg-muted px-1 py-0.25 rounded text-[10px]">espíritu</code>.</li>
              <li><strong>Por pasaje directo:</strong> Escribe <code className="bg-muted px-1 py-0.25 rounded text-[10px]">Juan 3:16</code>, <code className="bg-muted px-1 py-0.25 rounded text-[10px]">Génesis 1:1-3</code> o <code className="bg-muted px-1 py-0.25 rounded text-[10px]">1 Pedro 5</code>.</li>
              <li><strong>Link YouVersion:</strong> Pega directamente un enlace de YouVersion.</li>
            </ul>
          </div>
        </div>
      </form>

      {/* Historial de búsquedas recientes (paridad con la búsqueda universal mobile) */}
      {history.length > 0 && !loading && (
        <div className="max-w-4xl space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <History className="size-3.5" />
              Búsquedas recientes
            </span>
            <button
              type="button"
              onClick={() => setHistory(clearSearchHistory())}
              className="text-xs font-semibold text-muted-foreground hover:text-destructive"
            >
              Borrar todo
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.map((term) => (
              <span
                key={term}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card/60 pl-3 pr-1.5 py-1 text-xs text-foreground transition-colors hover:border-primary/30"
              >
                <button
                  type="button"
                  onClick={() => {
                    setQuery(term)
                    void runSearch(term)
                  }}
                  className="font-medium hover:text-primary"
                >
                  {term}
                </button>
                <button
                  type="button"
                  onClick={() => setHistory(removeSearchHistory(term))}
                  title={`Quitar "${term}" del historial`}
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Resultados */}
      <div className="space-y-4 max-w-4xl pt-4 border-t border-border">
        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="size-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin text-primary" />
            Buscando versículos...
          </div>
        ) : hasSearched && results.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No se encontraron versículos que coincidan con la búsqueda.
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>Se encontraron {results.length} resultados</span>
              {isReference && <span className="font-semibold text-primary">Coincidencia de referencia</span>}
            </div>

            <div className="space-y-3">
              {results.map((verse) => (
                <div
                  key={verse.id}
                  onClick={() => onSelectVerse(verse.bookId, verse.chapter, verse.verse, Number(bibleId))}
                  className="group p-4 rounded-xl border border-border bg-card/65 hover:bg-accent/40 cursor-pointer transition-all duration-200 hover:scale-[1.002] hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-primary flex items-center gap-1">
                          <BookOpen className="size-3.5" />
                          {verse.bookName} {verse.chapter}:{verse.verse}
                        </span>
                      </div>
                      <p className="text-sm md:text-base text-foreground/90 font-serif leading-relaxed">
                        {highlightText(verse.text, query)}
                      </p>
                    </div>

                    <div className="text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1 text-xs shrink-0 self-center">
                      <span className="hidden sm:inline">Leer capítulo</span>
                      <ExternalLink className="size-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-muted-foreground font-medium">
            Ingresa palabras clave o un pasaje arriba para comenzar a buscar.
          </div>
        )}
      </div>

    </div>
  )
}
