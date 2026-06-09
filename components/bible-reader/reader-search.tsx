"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Verse } from "@/lib/types"

export interface ReaderSearchProps {
  bibleId: number
  /** Controla visibilidad responsiva (el contenedor decide cuándo mostrarlo en móvil) */
  className?: string
  onNavigate: (verse: Verse) => void
}

function highlightMatch(text: string, query: string) {
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
}

/**
 * Buscador de pasajes/palabras del lector: debounce, dropdown de resultados,
 * historial de búsquedas recientes (localStorage) y resaltado de coincidencias.
 * Autocontenido: el contenedor solo recibe la navegación al resultado.
 */
export function ReaderSearch({ bibleId, className, onNavigate }: ReaderSearchProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Verse[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const searchRef = useRef<HTMLDivElement>(null)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cargar búsquedas recientes al montar
  useEffect(() => {
    if (typeof window === "undefined") return
    const saved = localStorage.getItem("recent_searches")
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved))
      } catch {
        setRecentSearches([])
      }
    }
  }, [])

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

  // Búsqueda con debounce
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

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // Cerrar con Escape (cuando el dropdown está abierto)
  useEffect(() => {
    if (!searchOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchOpen(false)
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [searchOpen])

  const goToResult = (v: Verse) => {
    if (searchQuery) saveSearch(searchQuery)
    setSearchOpen(false)
    setSearchQuery("")
    onNavigate(v)
  }

  return (
    <div className={cn("min-w-[220px] flex-1 md:max-w-sm", className)} ref={searchRef}>
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
              goToResult(searchResults[0])
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
          ) : searchLoading ? (
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
                  onClick={() => goToResult(v)}
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
          )}
        </div>
      )}
    </div>
  )
}
