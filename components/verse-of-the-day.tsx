"use client"

import * as React from "react"
import { useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Quote, Share2, BookOpen, ChevronDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface BibleVersion {
  id: number
  abbr: string
  name: string
}

interface VerseOfTheDayData {
  theme: string
  reference: string
  text: string
  idBook: number
  chapter: number
  verse_start: number
  verse_end: number
  idBible: number
}

// Mapa de colores sutiles para los temas (Premium UI)
const THEME_COLORS: Record<string, string> = {
  Amor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  Fe: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  Fortaleza: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  Ansiedad: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  Esperanza: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  Paz: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  Consuelo: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  Promesa: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20",
}

const DEFAULT_THEME_COLOR = "bg-primary/10 text-primary border-primary/20"

export function VerseOfTheDay() {
  const { data: biblesData } = useSWR<{ bibles: BibleVersion[] }>("/api/bibles", fetcher)
  const bibles = biblesData?.bibles ?? []
  
  // RVR1960 usually has an ID around 149 or 1, defaulting to 149.
  const [selectedBibleId, setSelectedBibleId] = useState<number>(149)

  const { data, isLoading, error } = useSWR<VerseOfTheDayData>(
    `/api/verse-of-the-day?idBible=${selectedBibleId}`,
    fetcher
  )

  const selectedBible = bibles.find(b => b.id === selectedBibleId)

  const handleShare = async () => {
    if (!data) return

    const shareText = `"${data.text}"\n\n- ${data.reference} (${selectedBible?.abbr})\nTema: ${data.theme}\n\nApp Biblia`
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Versículo del Día - ${data.reference}`,
          text: shareText,
        })
      } else {
        await navigator.clipboard.writeText(shareText)
        alert("Versículo copiado al portapapeles")
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Error al compartir:", err)
      }
    }
  }

  if (error) {
    return null // Ocultar si hay error severo o no hay versículo
  }

  const themeClass = data?.theme ? (THEME_COLORS[data.theme] || DEFAULT_THEME_COLOR) : DEFAULT_THEME_COLOR

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-background/50 p-6 md:p-8 shadow-sm backdrop-blur-xl dark:bg-zinc-950/50">
      {/* Elementos decorativos (Glassmorphism blobs) */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/5 blur-[50px] dark:bg-primary/10" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-blue-500/5 blur-[50px] dark:bg-blue-500/10" />

      <div className="relative z-10 flex flex-col items-center text-center">
        {isLoading ? (
          <>
            <Skeleton className="h-6 w-32 mb-6 rounded-full" />
            <Skeleton className="h-24 w-full max-w-lg mb-6" />
            <Skeleton className="h-4 w-40 mb-8" />
            <div className="flex gap-4">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </>
        ) : data ? (
          <>
            {/* Etiqueta Temática */}
            <span className={cn("mb-6 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium tracking-wide shadow-sm", themeClass)}>
              <Quote className="h-3.5 w-3.5" />
              {data.theme.toUpperCase()}
            </span>

            {/* Texto del Versículo */}
            <p className="mb-6 max-w-2xl text-xl font-medium leading-relaxed tracking-tight text-foreground md:text-2xl lg:text-3xl">
              "{data.text}"
            </p>

            {/* Referencia */}
            <p className="mb-8 text-sm font-semibold tracking-wide text-muted-foreground md:text-base">
              — {data.reference}
            </p>

            {/* Controles de Acción */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-10 rounded-full border-primary/20 bg-background/50 px-4 shadow-sm backdrop-blur-md hover:bg-accent/50 dark:bg-zinc-900/50">
                    <BookOpen className="mr-2 h-4 w-4 text-primary" />
                    <span className="font-medium">{selectedBible?.abbr || "Versión"}</span>
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-[200px] rounded-xl border-primary/10 bg-background/80 backdrop-blur-xl">
                  {bibles.map(b => (
                    <DropdownMenuItem 
                      key={b.id} 
                      className={cn("rounded-lg cursor-pointer", selectedBibleId === b.id && "bg-primary/10 font-bold text-primary")}
                      onClick={() => setSelectedBibleId(b.id)}
                    >
                      {b.name} ({b.abbr})
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button 
                variant="default" 
                onClick={handleShare}
                className="h-10 rounded-full px-5 font-medium shadow-md transition-transform hover:scale-105 active:scale-95"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Compartir
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
