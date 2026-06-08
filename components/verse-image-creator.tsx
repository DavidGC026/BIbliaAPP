"use client"

import * as React from "react"
import { useState, useRef } from "react"
import { Share2, Loader2, Image as ImageIcon, Download, X, Settings2, Layout, Upload, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { toPng } from "html-to-image"
import { createPortal } from "react-dom"

type AspectRatio = "1:1" | "3:4" | "9:16"
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

const EXPORT_SIZES: Record<AspectRatio, { width: number; height: number }> = {
  "1:1": { width: 1080, height: 1080 },
  "3:4": { width: 1080, height: 1440 },
  "9:16": { width: 1080, height: 1920 },
}

const PREVIEW_MAX_HEIGHT = 480
const PREVIEW_MAX_WIDTH = 270

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
  aspectRatio: AspectRatio
  overlayOpacity: number
  bgBlur: number
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
  aspectRatio,
  overlayOpacity,
  bgBlur,
  width,
  height,
}: CardProps) {
  const scale = width / PREVIEW_MAX_WIDTH
  const scaledText = Math.round(textSize * scale)
  const pad = width * 0.08

  return (
    <div
      style={{
        width,
        height,
        position: "relative",
        overflow: "hidden",
        backgroundColor: gradient.fallback,
        borderRadius: aspectRatio === "9:16" ? 0 : Math.round(16 * scale),
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
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: bgBlur > 0 ? `blur(${bgBlur * scale}px)` : undefined,
            transform: bgBlur > 0 ? "scale(1.12)" : undefined,
          }}
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

      {/* Decorative top glow */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "60%",
          height: "30%",
          background: "radial-gradient(ellipse at top, rgba(251,191,36,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: pad,
          width: "100%",
          height: "100%",
        }}
      >
        <span
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: scaledText * 2.2,
            lineHeight: 1,
            color: "rgba(251,191,36,0.25)",
            marginBottom: scaledText * 0.3,
            userSelect: "none",
          }}
          aria-hidden
        >
          &ldquo;
        </span>

        <p
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontStyle: "italic",
            lineHeight: 1.55,
            color: "#ffffff",
            textShadow: "0 2px 20px rgba(0,0,0,0.5)",
            marginBottom: scaledText * 0.6,
            fontSize: scaledText,
            maxWidth: "92%",
          }}
        >
          {text}
        </p>

        <div
          style={{
            width: scaledText * 1.8,
            height: Math.max(2, scale * 2),
            background: "linear-gradient(90deg, transparent, #fbbf24, transparent)",
            marginBottom: scaledText * 0.45,
            borderRadius: 999,
          }}
        />

        <p
          style={{
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "rgba(251,191,36,0.9)",
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
  const [isDownloadingBg, setIsDownloadingBg] = useState(false)

  const [editorTab, setEditorTab] = useState<EditorTab>("backgrounds")
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16")
  const [textSize, setTextSize] = useState<number>(20)
  const [overlayOpacity, setOverlayOpacity] = useState<number>(35)
  const [bgBlur, setBgBlur] = useState<number>(0)
  const [selectedUnsplashId, setSelectedUnsplashId] = useState<string | null>(null)

  const exportRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const exportSize = EXPORT_SIZES[aspectRatio]
  const previewScale = Math.min(
    PREVIEW_MAX_WIDTH / exportSize.width,
    PREVIEW_MAX_HEIGHT / exportSize.height,
  )
  const previewWidth = Math.round(exportSize.width * previewScale)
  const previewHeight = Math.round(exportSize.height * previewScale)

  const cardProps: CardProps = {
    text,
    reference,
    abbr,
    gradient: selectedGradient,
    textSize,
    backgroundImageUrl: backgroundMode === "photo" ? backgroundImageUrl : undefined,
    aspectRatio,
    overlayOpacity,
    bgBlur,
    width: exportSize.width,
    height: exportSize.height,
  }

  React.useEffect(() => {
    if (open && unsplashImages.length === 0) {
      setIsLoadingImages(true)
      fetch("/api/unsplash")
        .then((res) => res.json())
        .then((data) => {
          if (data.images) setUnsplashImages(data.images)
        })
        .catch((err) => console.error("Error fetching images", err))
        .finally(() => setIsLoadingImages(false))
    }
  }, [open, unsplashImages.length])

  React.useEffect(() => {
    if (!open) return
    if (text.length > 220) setTextSize(15)
    else if (text.length > 140) setTextSize(17)
    else if (text.length > 80) setTextSize(19)
    else setTextSize(22)
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
                <div className="flex items-center justify-center gap-3">
                  {([
                    { ratio: "9:16" as AspectRatio, label: "Historia", hint: "Vertical" },
                    { ratio: "3:4" as AspectRatio, label: "Retrato", hint: "3:4" },
                    { ratio: "1:1" as AspectRatio, label: "Cuadrado", hint: "1:1" },
                  ]).map(({ ratio, label, hint }) => (
                    <button
                      key={ratio}
                      onClick={() => setAspectRatio(ratio)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl px-4 py-3 border transition-all",
                        aspectRatio === ratio
                          ? "border-primary/60 bg-primary/10 text-primary shadow-lg shadow-primary/10"
                          : "border-white/10 text-white/50 hover:text-white hover:border-white/20",
                      )}
                    >
                      <div className={cn("border-2 border-current rounded-sm", ratio === "1:1" ? "w-7 h-7" : ratio === "3:4" ? "w-5 h-7" : "w-4 h-8")} />
                      <span className="text-xs font-bold">{label}</span>
                      <span className="text-[9px] opacity-60">{hint}</span>
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
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">Fotos</span>
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
                </div>
              </div>
            )}

            {editorTab === "settings" && (
              <div className="flex flex-col gap-4 pt-1 max-w-md mx-auto w-full">
                {[
                  { label: "Tamaño de letra", value: textSize, min: 12, max: 36, step: 1, set: setTextSize, unit: "px" },
                  { label: "Oscurecer fondo", value: overlayOpacity, min: 0, max: 80, step: 5, set: setOverlayOpacity, unit: "%" },
                  { label: "Difuminar foto", value: bgBlur, min: 0, max: 20, step: 1, set: setBgBlur, unit: "px", hide: backgroundMode !== "photo" },
                ].filter(s => !s.hide).map((s) => (
                  <div key={s.label} className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-white/80">{s.label}</label>
                      <span className="text-xs text-primary font-mono">{s.value}{s.unit}</span>
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
