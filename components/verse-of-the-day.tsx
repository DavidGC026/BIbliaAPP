"use client"

import * as React from "react"
import { useState, useRef } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Quote, Share2, BookOpen, ChevronDown, Loader2, Image as ImageIcon, Download, X, Type } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { toPng, toBlob } from "html-to-image"

interface BibleVersion {
  bibleId: number
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

const GRADIENT_BACKGROUNDS = [
  "from-zinc-950 to-neutral-900",
  "from-slate-950 to-slate-900",
  "from-stone-950 to-gray-900",
  "from-blue-950 to-indigo-950",
  "from-purple-950 to-violet-950",
]

type TextSize = "sm" | "md" | "lg"

const TEXT_SIZE_CLASSES: Record<TextSize, string> = {
  sm: "text-lg md:text-xl lg:text-2xl",
  md: "text-xl md:text-2xl lg:text-3xl",
  lg: "text-2xl md:text-3xl lg:text-4xl",
}

const DEFAULT_THEME_COLOR = "bg-primary/10 text-primary border-primary/20"

function Dialog({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode }) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10 mx-4 w-full max-w-sm">{children}</div>
    </div>
  )
}

const VerseImageCard = React.forwardRef<HTMLDivElement, {
  text: string
  reference: string
  theme: string
  abbr: string
  gradient: string
  textSize: TextSize
}>(function VerseImageCard({ text, reference, theme, abbr, gradient, textSize }, ref) {
  const themeClass = THEME_COLORS[theme] || DEFAULT_THEME_COLOR

  return (
    <div 
      ref={ref}
      className={cn(
        "relative flex h-[600px] w-[340px] flex-col items-center justify-center rounded-3xl p-8",
        "bg-gradient-to-b",
        gradient
      )}
    >
      <div className="absolute inset-0 rounded-3xl bg-black/10" />
      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        <span className={cn(
          "mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium tracking-wider",
          themeClass
        )}>
          <Quote className="h-4 w-4" />
          {theme.toUpperCase()}
        </span>
        
        <p className={cn(
          "font-serif italic leading-relaxed tracking-tight text-white/95 mb-6 max-w-xs",
          TEXT_SIZE_CLASSES[textSize]
        )}>
          "{text}"
        </p>
        
        <p className="text-sm font-medium tracking-wide text-white/70">
          — RVR1960 | {reference}
        </p>
      </div>
    </div>
  )
})

export function VerseOfTheDay() {
  const { data: biblesData } = useSWR<{ bibles: BibleVersion[] }>("/api/bibles", fetcher)
  const bibles = biblesData?.bibles ?? []
  
  const [selectedBibleId, setSelectedBibleId] = useState<number>(149)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [selectedGradient, setSelectedGradient] = useState<string>(GRADIENT_BACKGROUNDS[0])
  const [textSize, setTextSize] = useState<TextSize>("md")
  const [isExporting, setIsExporting] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const { data, isLoading, error } = useSWR<VerseOfTheDayData>(
    `/api/verse-of-the-day?idBible=${selectedBibleId}`,
    fetcher
  )

  const selectedBible = bibles.find(b => b.bibleId === selectedBibleId)

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

  const handleDownloadImage = async () => {
    if (!cardRef.current) return
    
    setIsExporting(true)
    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 3,
        width: cardRef.current.offsetWidth,
        height: cardRef.current.offsetHeight,
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
        },
      })
      
      const link = document.createElement("a")
      link.download = `versiculo-${data?.reference.replace(/\s/g, "-")}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error("Error al generar imagen:", err)
    } finally {
      setIsExporting(false)
    }
  }

  const handleShareImage = async () => {
    if (!cardRef.current) return
    
    setIsExporting(true)
    try {
      const dataUrl = await toBlob(cardRef.current, {
        quality: 1,
        pixelRatio: 3,
      })
      
      if (!dataUrl) return
      
      const file = new File([dataUrl], `versiculo-${data?.reference.replace(/\s/g, "-")}.png`, { type: "image/png" })
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Versículo del Día - ${data?.reference}`,
          text: `"${data?.text}" - RVR1960 | ${data?.reference}`,
          files: [file],
        })
      } else if (navigator.share) {
        await navigator.share({
          title: `Versículo del Día - ${data?.reference}`,
          text: `"${data?.text}" - RVR1960 | ${data?.reference}`,
        })
      } else {
        await navigator.clipboard.writeText(`"${data?.text}" - RVR1960 | ${data?.reference}`)
        alert("Versículo copiado al portapapeles")
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Error al compartir imagen:", err)
      }
    } finally {
      setIsExporting(false)
    }
  }

  if (error) {
    return null
  }

  const themeClass = data?.theme ? (THEME_COLORS[data.theme] || DEFAULT_THEME_COLOR) : DEFAULT_THEME_COLOR

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-background/50 p-6 md:p-8 shadow-sm backdrop-blur-xl dark:bg-zinc-950/50">
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
            <span className={cn("mb-6 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium tracking-wide shadow-sm", themeClass)}>
              <Quote className="h-3.5 w-3.5" />
              {data.theme.toUpperCase()}
            </span>

            <p className="mb-6 max-w-2xl text-xl font-medium leading-relaxed tracking-tight text-foreground md:text-2xl lg:text-3xl">
              "{data.text}"
            </p>

            <p className="mb-8 text-sm font-semibold tracking-wide text-muted-foreground md:text-base">
              — {data.reference}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-full border border-primary/20 bg-background/50 px-4 py-2 text-sm font-medium shadow-sm backdrop-blur-md hover:bg-accent/50 dark:bg-zinc-900/50 text-foreground cursor-pointer h-10">
                  <BookOpen className="mr-2 h-4 w-4 text-primary" />
                  <span className="font-medium">{selectedBible?.abbr || "Versión"}</span>
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-[200px] rounded-xl border-primary/10 bg-background/80 backdrop-blur-xl">
                  {bibles.map(b => (
                    <DropdownMenuItem 
                      key={b.bibleId} 
                      className={cn("rounded-lg cursor-pointer", selectedBibleId === b.bibleId && "bg-primary/10 font-bold text-primary")}
                      onClick={() => setSelectedBibleId(b.bibleId)}
                    >
                      {b.name} ({b.abbr})
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button 
                variant="outline"
                onClick={() => setIsImageModalOpen(true)}
                className="h-10 rounded-full px-5 font-medium shadow-md transition-transform hover:scale-105 active:scale-95"
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                Crear Imagen
              </Button>

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

      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <div className="flex flex-col items-center gap-6">
          <div className="flex w-full items-center justify-between rounded-t-3xl bg-background/80 p-4 backdrop-blur-xl">
            <h2 className="text-lg font-semibold">Vista Previa</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsImageModalOpen(false)}
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <VerseImageCard
            ref={cardRef}
            text={data?.text || ""}
            reference={data?.reference || ""}
            theme={data?.theme || ""}
            abbr="RVR1960"
            gradient={selectedGradient}
            textSize={textSize}
          />

          <div className="w-full space-y-4 rounded-b-3xl bg-background/80 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-center gap-2">
              <Type className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground mr-2">Tamaño:</span>
              {(["sm", "md", "lg"] as TextSize[]).map((size) => (
                <Button
                  key={size}
                  variant={textSize === size ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTextSize(size)}
                  className="h-7 px-3 text-xs"
                >
                  {size === "sm" ? "Pequeño" : size === "md" ? "Mediano" : "Grande"}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground text-center">Fondo</p>
              <div className="flex flex-wrap justify-center gap-2">
                {GRADIENT_BACKGROUNDS.map((gradient, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedGradient(gradient)}
                    className={cn(
                      "h-8 w-8 rounded-lg border-2 transition-all",
                      "bg-gradient-to-b",
                      gradient,
                      selectedGradient === gradient ? "border-primary scale-110" : "border-transparent opacity-70 hover:opacity-100"
                    )}
                    aria-label={`Seleccionar fondo ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleDownloadImage}
                disabled={isExporting}
                className="flex-1 h-10 rounded-full"
              >
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Descargar
              </Button>
              
              <Button
                variant="default"
                onClick={handleShareImage}
                disabled={isExporting}
                className="flex-1 h-10 rounded-full"
              >
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Share2 className="mr-2 h-4 w-4" />
                )}
                Compartir
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  )
}