"use client"

import * as React from "react"
import { useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  BookMarked,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Languages,
  Library,
  Compass,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface StrongEntry {
  strongCode: string
  lemma: string
  transliteration: string
  definition: string
}

interface DictionaryResponse {
  entries: StrongEntry[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

interface DictionaryInfo {
  slug: string
  name: string
  language: string | null
  entryCount: number
}

type Lang = "all" | "greek" | "hebrew"

const LANG_OPTIONS: { id: Lang; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "greek", label: "Griego (G)" },
  { id: "hebrew", label: "Hebreo (H)" },
]

const EXAMPLE_QUERIES = ["G25", "H430", "agapao", "shalom", "ἀγαπάω", "logos"]

const STRONG_CODE_REGEX = /\b([GH]\d{1,5})\b/g

function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value)
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

/** Lee ?strong=G25 de la URL al montar (deep link para compartir/integraciones). */
function getInitialStrongCode(): string {
  if (typeof window === "undefined") return ""
  const code = new URLSearchParams(window.location.search).get("strong") || ""
  return /^[gh]\d+$/i.test(code) ? code.toUpperCase() : ""
}

/**
 * Separa la definición cruda ("Strong: ...\n\nKJV: ...\n\nDerivation: ...")
 * en secciones etiquetadas para mostrarlas de forma estructurada.
 */
function parseDefinition(definition: string): { label: string; text: string }[] {
  if (!definition) return []
  const labelMap: Record<string, string> = {
    Strong: "Definición",
    KJV: "Traducciones (KJV)",
    Derivation: "Derivación",
  }
  const sections: { label: string; text: string }[] = []
  for (const block of definition.split(/\n\n+/)) {
    const match = block.match(/^(Strong|KJV|Derivation):\s*([\s\S]*)$/)
    if (match) {
      sections.push({ label: labelMap[match[1]] ?? match[1], text: match[2].trim() })
    } else if (block.trim()) {
      sections.push({ label: "", text: block.trim() })
    }
  }
  return sections
}

/** Convierte códigos Strong (G25, H031) dentro de un texto en enlaces clicables. */
function LinkifiedText({ text, onCodeClick }: { text: string; onCodeClick: (code: string) => void }) {
  const parts = text.split(STRONG_CODE_REGEX)
  return (
    <>
      {parts.map((part, i) =>
        /^[GH]\d{1,5}$/.test(part) ? (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation()
              onCodeClick(part)
            }}
            className="font-semibold text-primary hover:underline"
          >
            {part}
          </button>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  )
}

export function StrongDictionary() {
  const [query, setQuery] = useState(getInitialStrongCode)
  const [dict, setDict] = useState("strong")
  const [lang, setLang] = useState<Lang>("all")
  const [page, setPage] = useState(1)
  const [browsing, setBrowsing] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const debouncedQuery = useDebouncedValue(query)
  const hasValidQuery = debouncedQuery.length >= 2 || /^[gh]\d+$/i.test(debouncedQuery)
  const shouldFetch = hasValidQuery || browsing

  // Resetear página al cambiar búsqueda, idioma o diccionario
  React.useEffect(() => {
    setPage(1)
  }, [debouncedQuery, lang, dict, browsing])

  const { data: dictsData } = useSWR<{ dictionaries: DictionaryInfo[] }>(
    "/api/dictionary?list",
    fetcher,
  )
  const dictionaries = dictsData?.dictionaries ?? []

  const url = shouldFetch
    ? `/api/dictionary?dict=${dict}&q=${encodeURIComponent(debouncedQuery)}&lang=${lang}&page=${page}${browsing && !hasValidQuery ? "&browse" : ""}`
    : null
  const { data, error, isLoading } = useSWR<DictionaryResponse>(url, fetcher, {
    keepPreviousData: true,
  })

  const entries = data?.entries ?? []

  const goToCode = (code: string) => {
    setQuery(code)
    setBrowsing(false)
    setExpanded(code)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="space-y-6 p-1 md:p-4 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl flex items-center gap-2">
          Diccionario Bíblico
          <BookMarked className="size-7 text-primary" />
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Diccionario Strong de griego y hebreo. Busca por código (G25, H430), palabra original,
          transliteración o significado.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                if (e.target.value) setBrowsing(false)
              }}
              placeholder="Ej: G25, agapao, ἀγαπάω, H430..."
              className="pl-9 h-10"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            <Languages className="size-4 text-muted-foreground ml-2 mr-1 shrink-0" />
            {LANG_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setLang(opt.id)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
                  lang === opt.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {dictionaries.length > 1 && (
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 self-start">
            <Library className="size-4 text-muted-foreground ml-2 mr-1 shrink-0" />
            {dictionaries.map((d) => (
              <button
                key={d.slug}
                onClick={() => setDict(d.slug)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
                  dict === d.slug
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                )}
              >
                {d.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive text-center">
          {error.message || "Error al cargar el diccionario."}
        </div>
      )}

      {!shouldFetch && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-4">
          <BookMarked className="mx-auto size-10 text-primary/40" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Escribe un código Strong o una palabra para buscar
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Mínimo 2 caracteres. Prueba con estos ejemplos:
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {EXAMPLE_QUERIES.map((example) => (
              <button
                key={example}
                onClick={() => setQuery(example)}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground hover:bg-accent/50 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => setBrowsing(true)} className="gap-2">
            <Compass className="size-4" />
            Explorar todo el diccionario
          </Button>
        </div>
      )}

      {shouldFetch && isLoading && !data && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-6 animate-spin mr-2" />
          <span className="text-sm">Cargando diccionario...</span>
        </div>
      )}

      {shouldFetch && data && (
        <>
          <p className="text-xs text-muted-foreground">
            {data.total.toLocaleString()} entradas encontradas
          </p>

          {entries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
              <BookMarked className="mx-auto mb-2 size-8 opacity-40" />
              <p className="text-sm">No se encontraron entradas para tu búsqueda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => {
                const isOpen = expanded === entry.strongCode
                const isGreek = entry.strongCode.startsWith("G")
                const sections = parseDefinition(entry.definition)
                return (
                  <div
                    key={entry.strongCode}
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpanded(isOpen ? null : entry.strongCode)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        setExpanded(isOpen ? null : entry.strongCode)
                      }
                    }}
                    className="w-full text-left rounded-xl border border-border bg-card/40 hover:bg-accent/30 p-4 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={cn(
                              "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide",
                              isGreek
                                ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                            )}
                          >
                            {entry.strongCode}
                          </span>
                          <span className="font-bold text-lg text-foreground" dir="auto">
                            {entry.lemma}
                          </span>
                          {entry.transliteration && (
                            <span className="text-sm italic text-muted-foreground">
                              {entry.transliteration}
                            </span>
                          )}
                        </div>

                        {isOpen ? (
                          <div className="mt-3 space-y-3">
                            {sections.length === 0 && (
                              <p className="text-sm text-muted-foreground">
                                Sin definición disponible.
                              </p>
                            )}
                            {sections.map((section, i) => (
                              <div key={i}>
                                {section.label && (
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary/80 mb-0.5">
                                    {section.label}
                                  </p>
                                )}
                                <p className="text-sm text-foreground/90 whitespace-pre-line">
                                  <LinkifiedText text={section.text} onCodeClick={goToCode} />
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2 whitespace-pre-line">
                            {entry.definition || "Sin definición disponible."}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold text-primary shrink-0 mt-1">
                        {isOpen ? "Cerrar" : "Ver más"}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="gap-1"
              >
                <ChevronLeft className="size-4" />
                Anterior
              </Button>
              <span className="text-xs text-muted-foreground font-semibold">
                Página {data.page} de {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages || isLoading}
                onClick={() => setPage((p) => p + 1)}
                className="gap-1"
              >
                Siguiente
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
