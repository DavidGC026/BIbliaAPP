"use client"

import * as React from "react"
import { useState, useRef } from "react"
import { Share2, Loader2, Image as ImageIcon, Download, X, Settings2, Layout, Upload, Palette, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  IMAGE_FORMATS,
  type ImageFormatId,
  bgImageStyle,
  formatById,
} from "@/lib/verse-image-formats"
import { getVerseImageTemplate, saveVerseImageTemplate } from "@/lib/verse-image-template"
import { toPng } from "html-to-image"
import { createPortal } from "react-dom"

type EditorTab = "format" | "backgrounds" | "settings"
type BackgroundMode = "gradient" | "photo"

interface GradientPreset {
  id: string
  name: string
  css: string
  fallback: string
  swatch: string
}

const GRADIENT_PRESETS: GradientPreset[] = [
  { id: "gold", name: "Oro", css: "linear-gradient(160deg, #92400e 0%, #78350f 35%, #451a03 70%, #1c1917 100%)", fallback: "#78350f", swatch: "linear-gradient(135deg, #fbbf24, #92400e)" },
  { id: "sunset", name: "Atardecer", css: "linear-gradient(160deg, #ea580c 0%, #c2410c 30%, #7c2d12 65%, #431407 100%)", fallback: "#c2410c", swatch: "linear-gradient(135deg, #fb923c, #dc2626)" },
  { id: "ocean", name: "Océano", css: "linear-gradient(160deg, #0369a1 0%, #0e7490 35%, #155e75 70%, #083344 100%)", fallback: "#0e7490", swatch: "linear-gradient(135deg, #38bdf8, #0369a1)" },
  { id: "forest", name: "Bosque", css: "linear-gradient(160deg, #15803d 0%, #166534 35%, #14532d 70%, #052e16 100%)", fallback: "#166534", swatch: "linear-gradient(135deg, #4ade80, #15803d)" },
  { id: "purple", name: "Púrpura", css: "linear-gradient(160deg, #7e22ce 0%, #6d28d9 35%, #4c1d95 70%, #2e1065 100%)", fallback: "#6d28d9", swatch: "linear-gradient(135deg, #c084fc, #7c3aed)" },
  { id: "rose", name: "Rosa", css: "linear-gradient(160deg, #e11d48 0%, #be123c 35%, #881337 70%, #4c0519 100%)", fallback: "#be123c", swatch: "linear-gradient(135deg, #fb7185, #e11d48)" },
  { id: "night", name: "Noche", css: "linear-gradient(160deg, #1d4ed8 0%, #4338ca 40%, #312e81 75%, #0f172a 100%)", fallback: "#312e81", swatch: "linear-gradient(135deg, #60a5fa, #4338ca)" },
  { id: "earth", name: "Tierra", css: "linear-gradient(160deg, #a16207 0%, #854d0e 35%, #713f12 70%, #292524 100%)", fallback: "#854d0e", swatch: "linear-gradient(135deg, #fcd34d, #a16207)" },
]

const PREVIEW_MAX_HEIGHT = 480
const PREVIEW_MAX_WIDTH = 320

const SEARCH_HINTS = ["naturaleza", "cielo", "mar", "montaña", "amanecer", "flores", "cruz", "bosque", "atardecer", "lluvia"]

/* Estilos de diseño — espejo de IMAGE_STYLES en mobile/components/VerseImageCreator.tsx */
const AMBER = "#fbbf24"

type ImageStyleId = "editorial" | "minimal" | "bold" | "quiet"

interface ImageStylePreset {
  id: ImageStyleId
  label: string
  hint: string
  align: "center" | "left"
  /** Oscurecido base del fondo en % (ajustable luego en Ajustes) */
  overlay: number
  accent: string
  serif: boolean
}

const IMAGE_STYLES: ImageStylePreset[] = [
  { id: "editorial", label: "Editorial", hint: "Clásico y elegante", align: "center", overlay: 35, accent: AMBER, serif: true },
  { id: "minimal", label: "Minimal", hint: "Limpio y sobrio", align: "left", overlay: 46, accent: "#FFFFFF", serif: false },
  { id: "bold", label: "Impacto", hint: "Alto contraste", align: "center", overlay: 58, accent: "#FDE68A", serif: false },
  { id: "quiet", label: "Sereno", hint: "Suave y contemplativo", align: "left", overlay: 28, accent: "#BAE6FD", serif: true },
]

function textSizeForLength(len: number) {
  if (len > 220) return 15
  if (len > 140) return 17
  if (len > 80) return 19
  return 22
}

function mergeUnsplashImages<T extends { id: string }>(prev: T[], next: T[]): T[] {
  const seen = new Set(prev.map((i) => i.id))
  return [...prev, ...next.filter((i) => !seen.has(i.id))]
}

const SWATCH_GRID =
  "grid grid-cols-4 gap-1.5 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-10"

const SWATCH_BTN =
  "flex flex-col items-center gap-0.5 rounded-lg p-1 border transition-all min-w-0"

const SWATCH_LABEL = "text-[8px] font-medium text-white/65 truncate w-full text-center leading-tight"

interface CardProps {
  text: string
  reference: string
  abbr: string
  gradient: GradientPreset
  textSize: number
  backgroundImageUrl?: string
  imageFormat: ImageFormatId
  imageStyle: ImageStylePreset
  overlayOpacity: number
  bgBlur: number
  bgPosX: number
  bgPosY: number
  bgZoom: number
  width: number
  height: number
}

function VerseImageCard({
  text,
  reference,
  abbr,
  gradient,
  textSize,
  backgroundImageUrl,
  imageFormat,
  imageStyle,
  overlayOpacity,
  bgBlur,
  bgPosX,
  bgPosY,
  bgZoom,
  width,
  height,
}: CardProps) {
  const scale = width / 270
  const scaledText = Math.round(textSize * scale)
  const pad = width * 0.08
  const accent = imageStyle.accent
  const alignLeft = imageStyle.align === "left"
  const fontFamily = imageStyle.serif ? "Georgia, 'Times New Roman', serif" : "system-ui, -apple-system, sans-serif"

  return (
    <div
      style={{
        width,
        height,
        position: "relative",
        overflow: "hidden",
        backgroundColor: gradient.fallback,
        borderRadius: imageFormat === "9:16" ? 0 : Math.round(16 * scale),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {!backgroundImageUrl && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: gradient.css,
          }}
        />
      )}

      {backgroundImageUrl && (
        <img
          src={backgroundImageUrl}
          alt=""
          style={bgImageStyle(bgPosX, bgPosY, bgZoom, bgBlur, scale)}
        />
      )}

      {/* Vignette + overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,${overlayOpacity / 100 * 0.6}) 100%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "#000",
          opacity: overlayOpacity / 100,
        }}
      />

      {/* Decorative top glow (color del acento del estilo, como en el móvil) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "60%",
          height: "30%",
          background: `radial-gradient(ellipse at top, ${accent}26 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: alignLeft ? "flex-start" : "center",
          justifyContent: "center",
          textAlign: imageStyle.align,
          padding: pad,
          width: "100%",
          height: "100%",
        }}
      >
        <span
          style={{
            fontFamily,
            fontSize: scaledText * 2.2,
            lineHeight: 1,
            color: `${accent}40`,
            marginBottom: scaledText * 0.3,
            userSelect: "none",
          }}
          aria-hidden
        >
          &ldquo;
        </span>

        <p
          style={{
            fontFamily,
            fontStyle: imageStyle.serif ? "italic" : "normal",
            fontWeight: imageStyle.id === "bold" ? 800 : 500,
            lineHeight: 1.55,
            color: "#ffffff",
            textShadow: "0 2px 20px rgba(0,0,0,0.5)",
            marginBottom: scaledText * 0.6,
            fontSize: scaledText,
            maxWidth: alignLeft ? "96%" : "92%",
          }}
        >
          {text}
        </p>

        <div
          style={{
            width: alignLeft ? scaledText * 2.4 : scaledText * 1.8,
            height: Math.max(2, scale * 2),
            background: alignLeft ? accent : `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            marginBottom: scaledText * 0.45,
            borderRadius: 999,
          }}
        />

        <p
          style={{
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: accent,
            fontSize: Math.max(11, scaledText * 0.48),
            textShadow: "0 1px 8px rgba(0,0,0,0.4)",
          }}
        >
          {reference}
        </p>
        <p
          style={{
            marginTop: scaledText * 0.2,
            fontWeight: 500,
            letterSpacing: "0.08em",
            color: "rgba(255,255,255,0.55)",
            fontSize: Math.max(10, scaledText * 0.38),
          }}
        >
          {abbr}
        </p>
      </div>
    </div>
  )
}

function Dialog({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (open) document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [open])

  if (!open || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-zinc-950 animate-in fade-in duration-200" role="dialog" aria-modal="true">
      {children}
    </div>,
    document.body,
  )
}

async function waitForImages(node: HTMLElement) {
  const images = Array.from(node.querySelectorAll("img"))
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve()
            return
          }
          img.onload = () => resolve()
          img.onerror = () => resolve()
        }),
    ),
  )
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

async function urlToDataUrl(url: string): Promise<string> {
  if (url.startsWith("data:")) return url
  const res = await fetch(`/api/image-proxy?url=${encodeURIComponent(url)}`)
  if (!res.ok) throw new Error("No se pudo cargar la imagen de fondo")
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

interface VerseImageCreatorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  text: string
  reference: string
  theme?: string
  abbr?: string
}

export function VerseImageCreator({ open, onOpenChange, text, reference, abbr = "RVR1960" }: VerseImageCreatorProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [selectedGradient, setSelectedGradient] = useState<GradientPreset>(GRADIENT_PRESETS[0])
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>("gradient")
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | undefined>()
  const [unsplashImages, setUnsplashImages] = useState<any[]>([])
  const [isLoadingImages, setIsLoadingImages] = useState(false)
  const [isLoadingMoreImages, setIsLoadingMoreImages] = useState(false)
  const [isDownloadingBg, setIsDownloadingBg] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeSearch, setActiveSearch] = useState<string | undefined>()
  const [unsplashPage, setUnsplashPage] = useState(1)
  const [hasMorePhotos, setHasMorePhotos] = useState(false)

  const [editorTab, setEditorTab] = useState<EditorTab>("format")
  const [imageFormat, setImageFormat] = useState<ImageFormatId>("9:16")
  const [styleId, setStyleId] = useState<ImageStyleId>("editorial")
  const [templateSaved, setTemplateSaved] = useState(false)
  const [textSize, setTextSize] = useState<number>(20)
  const [overlayOpacity, setOverlayOpacity] = useState<number>(35)
  const [bgBlur, setBgBlur] = useState<number>(0)
  const [bgPosX, setBgPosX] = useState(50)
  const [bgPosY, setBgPosY] = useState(50)
  const [bgZoom, setBgZoom] = useState(100)
  const [selectedUnsplashId, setSelectedUnsplashId] = useState<string | null>(null)

  const exportRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageFormatRef = useRef(imageFormat)
  imageFormatRef.current = imageFormat

  const exportSize = formatById(imageFormat)
  const previewScale = Math.min(
    PREVIEW_MAX_WIDTH / exportSize.width,
    PREVIEW_MAX_HEIGHT / exportSize.height,
  )
  const previewWidth = Math.round(exportSize.width * previewScale)
  const previewHeight = Math.round(exportSize.height * previewScale)

  const imageStyle = IMAGE_STYLES.find((s) => s.id === styleId) ?? IMAGE_STYLES[0]

  const cardProps: CardProps = {
    text,
    reference,
    abbr,
    gradient: selectedGradient,
    textSize,
    backgroundImageUrl: backgroundMode === "photo" ? backgroundImageUrl : undefined,
    imageFormat,
    imageStyle,
    overlayOpacity,
    bgBlur,
    bgPosX,
    bgPosY,
    bgZoom,
    width: exportSize.width,
    height: exportSize.height,
  }

  const loadPhotos = React.useCallback(async (
    query: string | undefined,
    page = 1,
    append = false,
    formatId?: ImageFormatId,
  ) => {
    if (page === 1) setIsLoadingImages(true)
    else setIsLoadingMoreImages(true)
    try {
      const params = new URLSearchParams()
      if (query?.trim()) params.set("query", query.trim())
      params.set("orientation", formatById(formatId ?? imageFormatRef.current).unsplashOrientation)
      if (page > 1) params.set("page", String(page))
      const res = await fetch(`/api/unsplash?${params}`)
      const data = await res.json()
      if (data.images) {
        setUnsplashImages((prev) => (append ? mergeUnsplashImages(prev, data.images) : data.images))
        setUnsplashPage(page)
        setHasMorePhotos(Boolean(data.hasMore))
      }
    } catch (err) {
      console.error("Error fetching images", err)
      if (!append) setUnsplashImages([])
    } finally {
      setIsLoadingImages(false)
      setIsLoadingMoreImages(false)
    }
  }, [])

  React.useEffect(() => {
    if (!open) return
    setSearchQuery("")
    setActiveSearch(undefined)
    setUnsplashPage(1)
    setHasMorePhotos(false)
    setSelectedUnsplashId(null)
    setBackgroundMode("gradient")
    setBackgroundImageUrl(undefined)
    setBgPosX(50)
    setBgPosY(50)
    setBgZoom(100)
    setTemplateSaved(false)

    // Restaurar "mi estilo" guardado (formato + diseño + color), como en el móvil
    let formatId: ImageFormatId | undefined
    const template = getVerseImageTemplate()
    if (template) {
      const gradientFromTemplate = GRADIENT_PRESETS.find((g) => g.id === template.gradientId)
      if (gradientFromTemplate) setSelectedGradient(gradientFromTemplate)
      const styleFromTemplate = IMAGE_STYLES.find((s) => s.id === template.styleId)
      if (styleFromTemplate) {
        setStyleId(styleFromTemplate.id)
        setOverlayOpacity(styleFromTemplate.overlay)
      }
      if (IMAGE_FORMATS.some((f) => f.id === template.formatId)) {
        formatId = template.formatId as ImageFormatId
        setImageFormat(formatId)
      }
    }
    void loadPhotos(undefined, 1, false, formatId)
  }, [open, loadPhotos])

  React.useEffect(() => {
    setTemplateSaved(false)
  }, [imageFormat, styleId, selectedGradient])

  const saveTemplate = () => {
    saveVerseImageTemplate({ formatId: imageFormat, styleId, gradientId: selectedGradient.id })
    setTemplateSaved(true)
  }

  const selectStyle = (style: ImageStylePreset) => {
    setStyleId(style.id)
    // El estilo trae su oscurecido base; sigue siendo ajustable en Ajustes
    setOverlayOpacity(style.overlay)
  }

  const selectFormat = (id: ImageFormatId) => {
    setImageFormat(id)
    void loadPhotos(activeSearch, 1, false, id)
  }

  const runSearch = () => {
    const q = searchQuery.trim() || undefined
    setActiveSearch(q)
    void loadPhotos(q, 1, false)
  }

  const loadMorePhotos = () => {
    if (!hasMorePhotos || isLoadingMoreImages) return
    void loadPhotos(activeSearch, unsplashPage + 1, true)
  }

  React.useEffect(() => {
    if (!open) return
    setTextSize(textSizeForLength(text.length))
  }, [open, text])

  const selectGradient = (preset: GradientPreset) => {
    setBackgroundMode("gradient")
    setSelectedGradient(preset)
    setBackgroundImageUrl(undefined)
    setSelectedUnsplashId(null)
  }

  const handleSelectUnsplashImage = async (url: string, imageId: string) => {
    setIsDownloadingBg(true)
    try {
      const dataUrl = await urlToDataUrl(url)
      setBackgroundMode("photo")
      setBackgroundImageUrl(dataUrl)
      setSelectedUnsplashId(imageId)
    } catch (e) {
      console.error(e)
      alert("No se pudo cargar esa imagen de fondo. Prueba otra.")
    } finally {
      setIsDownloadingBg(false)
    }
  }

  const captureExportImage = async () => {
    if (!exportRef.current) throw new Error("No hay lienzo de exportación")

    let safeBg = backgroundMode === "photo" ? backgroundImageUrl : undefined
    if (safeBg && !safeBg.startsWith("data:")) {
      safeBg = await urlToDataUrl(safeBg)
    }

    const exportImg = exportRef.current.querySelector("img")
    if (exportImg && safeBg) {
      exportImg.src = safeBg
    }

    await waitForImages(exportRef.current)

    return toPng(exportRef.current, {
      cacheBust: true,
      pixelRatio: 1,
      backgroundColor: selectedGradient.fallback,
      width: exportSize.width,
      height: exportSize.height,
    })
  }

  const handleDownloadImage = async () => {
    setIsExporting(true)
    try {
      const dataUrl = await captureExportImage()
      const link = document.createElement("a")
      link.download = `versiculo-${reference.replace(/[^\w\d-]/g, "-")}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error("Error al generar imagen:", err)
      alert("No se pudo descargar la imagen. Intenta con otro fondo.")
    } finally {
      setIsExporting(false)
    }
  }

  const handleShareImageExternal = async () => {
    setIsExporting(true)
    try {
      const dataUrl = await captureExportImage()
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const file = new File([blob], `versiculo-${reference.replace(/[^\w\d-]/g, "-")}.png`, { type: "image/png" })
      const shareText = `"${text}" - ${reference}\n\nLee más en https://biblia2.dvguzman.com`

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `Versículo - ${reference}`, text: shareText, files: [file] })
      } else if (navigator.share) {
        await navigator.share({ title: `Versículo - ${reference}`, text: shareText })
      } else {
        await navigator.clipboard.writeText(shareText)
        alert("Texto copiado al portapapeles.")
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        alert("Hubo un problema al compartir la imagen.")
      }
    } finally {
      setIsExporting(false)
    }
  }

  const handleShareImageCommunity = async () => {
    setIsExporting(true)
    try {
      const dataUrl = await captureExportImage()
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const formData = new FormData()
      formData.append("file", blob, `versiculo-${reference.replace(/[^\w\d-]/g, "-")}.png`)

      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData })
      if (!uploadRes.ok) throw new Error("Error subiendo la imagen")
      const uploadData = await uploadRes.json()

      const postContent = `**Versículo:** ${reference}\n\n"${text}"\n\n![Versículo](${uploadData.url})`
      const postRes = await fetch("/api/feed/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: postContent }),
      })
      if (!postRes.ok) throw new Error("Error creando publicación")

      alert("¡Publicado en la Comunidad con éxito!")
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      alert("Hubo un problema al publicar en la comunidad.")
    } finally {
      setIsExporting(false)
    }
  }

  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsDownloadingBg(true)
    const reader = new FileReader()
    reader.onloadend = () => {
      setBackgroundMode("photo")
      setBackgroundImageUrl(reader.result as string)
      setSelectedUnsplashId(null)
      setIsDownloadingBg(false)
    }
    reader.onerror = () => setIsDownloadingBg(false)
    reader.readAsDataURL(file)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="flex h-full w-full flex-col bg-zinc-950 text-white">
        <div aria-hidden style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none", opacity: 0 }}>
          <div ref={exportRef}>
            <VerseImageCard {...cardProps} />
          </div>
        </div>

        {/* Header */}
        <div className="flex w-full items-center justify-between px-4 py-3 bg-zinc-900/80 backdrop-blur-xl border-b border-white/[0.06] shrink-0">
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-white/70 hover:text-white hover:bg-white/10 rounded-full h-9 w-9">
            <X className="h-5 w-5" />
          </Button>
          <div className="flex flex-col items-center leading-none">
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary/80">Editor</span>
            <h2 className="text-sm font-semibold tracking-wide text-white mt-0.5">Crear Imagen</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" onClick={handleDownloadImage} disabled={isExporting || isDownloadingBg} className="text-white/70 hover:text-white hover:bg-white/10 rounded-full h-9 w-9" title="Descargar">
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full h-9 pl-3 pr-4 text-sm font-semibold shadow-lg shadow-primary/20 disabled:opacity-50" disabled={isExporting || isDownloadingBg}>
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                <span className="hidden sm:inline">Compartir</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[210px] rounded-xl border-white/10 bg-zinc-900/95 text-white backdrop-blur-xl">
                <DropdownMenuItem onClick={handleShareImageCommunity} className="rounded-lg cursor-pointer hover:bg-white/10">Compartir en Comunidad</DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareImageExternal} className="rounded-lg cursor-pointer hover:bg-white/10">Compartir Externo</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Preview — vertical, grande */}
        <div className="flex-1 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_#27272a_0%,_#09090b_70%)] px-4 py-5 overflow-hidden min-h-0">
          {isDownloadingBg ? (
            <div className="flex flex-col items-center gap-3 text-white/50">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs">Cargando fondo...</p>
            </div>
          ) : (
            <div
              className="rounded-2xl overflow-hidden ring-1 ring-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
              style={{ width: previewWidth, height: previewHeight }}
            >
              <div style={{ transform: `scale(${previewScale})`, transformOrigin: "top left", width: exportSize.width, height: exportSize.height }}>
                <VerseImageCard {...cardProps} />
              </div>
            </div>
          )}
        </div>

        {/* Panel inferior */}
        <div className="w-full bg-zinc-900/95 backdrop-blur-xl border-t border-white/[0.06] shrink-0 flex flex-col max-h-[42vh] rounded-t-2xl">
          <div className="flex justify-center pt-2 pb-1">
            <div className="h-1 w-10 rounded-full bg-white/15" />
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-2 custom-scrollbar">
            {editorTab === "format" && (
              <div className="flex flex-col gap-3 py-2">
                <p className="text-center text-[11px] text-white/50 uppercase tracking-wider font-semibold">Formato de imagen</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {IMAGE_FORMATS.map((format) => (
                    <button
                      key={format.id}
                      type="button"
                      onClick={() => selectFormat(format.id)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl px-3 py-2.5 border transition-all min-w-[72px]",
                        imageFormat === format.id
                          ? "border-primary/60 bg-primary/10 text-primary shadow-lg shadow-primary/10"
                          : "border-white/10 text-white/50 hover:text-white hover:border-white/20",
                      )}
                    >
                      <div
                        className={cn("border-2 border-current rounded-sm", imageFormat === format.id ? "border-primary" : "")}
                        style={{ width: format.previewW, height: format.previewH }}
                      />
                      <span className="text-xs font-bold">{format.label}</span>
                      <span className="text-[9px] opacity-60">{format.hint}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-1">
                  <p className="text-[11px] text-white/50 uppercase tracking-wider font-semibold">Diseño</p>
                  <button
                    type="button"
                    onClick={saveTemplate}
                    disabled={templateSaved}
                    className={cn(
                      "text-[11px] font-bold transition-colors",
                      templateSaved ? "text-white/40" : "text-primary hover:text-primary/80",
                    )}
                  >
                    {templateSaved ? "✓ Estilo guardado" : "Guardar como mi estilo"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {IMAGE_STYLES.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => selectStyle(style)}
                      className={cn(
                        "flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-all",
                        styleId === style.id
                          ? "border-primary/60 bg-primary/10 shadow-lg shadow-primary/10"
                          : "border-white/10 hover:border-white/20",
                      )}
                    >
                      <span className={cn("text-[13px] font-extrabold", styleId === style.id ? "text-primary" : "text-white/85")}>
                        {style.label}
                      </span>
                      <span className="text-[10px] text-white/45">{style.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {editorTab === "backgrounds" && (
              <div className="space-y-4 py-1">
                {/* Colores */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <Palette className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">Colores</span>
                  </div>
                  <div className={SWATCH_GRID}>
                    {GRADIENT_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => selectGradient(preset)}
                        title={preset.name}
                        className={cn(
                          SWATCH_BTN,
                          backgroundMode === "gradient" && selectedGradient.id === preset.id
                            ? "border-primary ring-1 ring-primary/50"
                            : "border-white/10 hover:border-white/25",
                        )}
                      >
                        <div className="w-full aspect-square rounded-md min-h-0" style={{ background: preset.swatch }} />
                        <span className={SWATCH_LABEL}>{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fotos */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <ImageIcon className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">Fotos (Unsplash)</span>
                  </div>

                  <div className="flex gap-2 mb-2">
                    <div className="relative flex-1 min-w-0">
                      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && runSearch()}
                        placeholder="Buscar fondo (mar, cielo, cruz…)"
                        className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-8 pr-3 text-sm text-white placeholder:text-white/35 focus:border-primary/50 focus:outline-none"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={runSearch}
                      disabled={isLoadingImages}
                      className="shrink-0 rounded-lg bg-white/10 text-white hover:bg-white/15"
                    >
                      Buscar
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {SEARCH_HINTS.map((hint) => (
                      <button
                        key={hint}
                        type="button"
                        onClick={() => {
                          setSearchQuery(hint)
                          setActiveSearch(hint)
                          void loadPhotos(hint, 1, false)
                        }}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                          activeSearch === hint
                            ? "border-primary/50 bg-primary/10 text-primary"
                            : "border-white/10 text-white/50 hover:border-white/25 hover:text-white/80",
                        )}
                      >
                        {hint}
                      </button>
                    ))}
                  </div>

                  <div className={SWATCH_GRID}>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(SWATCH_BTN, "justify-center aspect-[4/5] border-dashed border-white/20 bg-white/5 hover:bg-white/10")}
                    >
                      <Upload className="h-3.5 w-3.5 text-white/55 shrink-0" />
                      <span className={SWATCH_LABEL}>Subir</span>
                    </button>
                    <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleLocalImageUpload} />

                    {isLoadingImages ? (
                      <div className="col-span-3 md:col-span-5 xl:col-span-9 flex items-center justify-center aspect-[4/5] rounded-lg bg-white/5">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    ) : (
                      unsplashImages.map((img) => (
                        <button
                          key={img.id}
                          onClick={() => handleSelectUnsplashImage(img.url, img.id)}
                          className={cn(
                            SWATCH_BTN,
                            "p-0 overflow-hidden aspect-[4/5]",
                            backgroundMode === "photo" && selectedUnsplashId === img.id
                              ? "border-primary ring-1 ring-primary/50"
                              : "border-white/10 hover:border-white/25",
                          )}
                        >
                          <img src={img.thumb} alt="" className="object-cover h-full w-full rounded-md" />
                        </button>
                      ))
                    )}
                  </div>

                  {hasMorePhotos && !isLoadingImages ? (
                    <button
                      type="button"
                      onClick={loadMorePhotos}
                      disabled={isLoadingMoreImages}
                      className="mt-3 w-full rounded-lg border border-white/10 py-2 text-xs font-semibold text-white/70 hover:border-white/20 hover:text-white disabled:opacity-50"
                    >
                      {isLoadingMoreImages ? "Cargando más…" : "Cargar más fotos"}
                    </button>
                  ) : null}
                </div>
              </div>
            )}

            {editorTab === "settings" && (
              <div className="flex flex-col gap-4 pt-1 max-w-md mx-auto w-full">
                {[
                  { label: "Tamaño de letra", value: textSize, min: 12, max: 36, step: 1, set: setTextSize, unit: "px" },
                  { label: "Oscurecer fondo", value: overlayOpacity, min: 0, max: 80, step: 5, set: setOverlayOpacity, unit: "%" },
                  { label: "Difuminar foto", value: bgBlur, min: 0, max: 20, step: 1, set: setBgBlur, unit: "px", hide: backgroundMode !== "photo" },
                  { label: "Zoom del fondo", value: bgZoom, min: 100, max: 200, step: 5, set: setBgZoom, unit: "%", hide: backgroundMode !== "photo" },
                  { label: "Posición horizontal", value: bgPosX, min: 0, max: 100, step: 5, set: setBgPosX, unit: "%", hide: backgroundMode !== "photo" },
                  { label: "Posición vertical", value: bgPosY, min: 0, max: 100, step: 5, set: setBgPosY, unit: "%", hide: backgroundMode !== "photo" },
                ].filter(s => !s.hide).map((s) => (
                  <div key={s.label} className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-white/80">{s.label}</label>
                      <div className="flex items-center gap-2">
                        {s.label === "Tamaño de letra" ? (
                          <button
                            type="button"
                            onClick={() => setTextSize(textSizeForLength(text.length))}
                            className="text-[11px] font-semibold text-primary hover:text-primary/80"
                          >
                            Auto
                          </button>
                        ) : null}
                        <span className="text-xs text-primary font-mono">{s.value}{s.unit}</span>
                      </div>
                    </div>
                    <input type="range" min={s.min} max={s.max} step={s.step} value={s.value} onChange={(e) => s.set(Number(e.target.value))} className="w-full accent-primary h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex items-center justify-around p-2 border-t border-white/[0.06] bg-zinc-950/80 pb-safe">
            {([
              { tab: "format" as EditorTab, icon: Layout, label: "Formato" },
              { tab: "backgrounds" as EditorTab, icon: ImageIcon, label: "Fondos" },
              { tab: "settings" as EditorTab, icon: Settings2, label: "Ajustes" },
            ]).map(({ tab, icon: Icon, label }) => (
              <button
                key={tab}
                onClick={() => setEditorTab(tab)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl px-5 py-2 transition-all",
                  editorTab === tab ? "text-primary bg-primary/10" : "text-white/50 hover:text-white hover:bg-white/5",
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  )
}
