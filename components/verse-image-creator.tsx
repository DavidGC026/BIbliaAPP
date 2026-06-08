"use client"

import * as React from "react"
import { useState, useRef } from "react"
import { Share2, Loader2, Image as ImageIcon, Download, X, Settings2, Layout, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { toPng, toBlob } from "html-to-image"
import { createPortal } from "react-dom"

const GRADIENT_CSS: Record<string, string> = {
  "from-zinc-950 to-neutral-900": "linear-gradient(to bottom, #09090b, #171717)",
  "from-slate-950 to-slate-900": "linear-gradient(to bottom, #020617, #0f172a)",
  "from-stone-950 to-gray-900": "linear-gradient(to bottom, #0c0a09, #111827)",
  "from-blue-950 to-indigo-950": "linear-gradient(to bottom, #172554, #1e1b4b)",
  "from-purple-950 to-violet-950": "linear-gradient(to bottom, #3b0764, #2e1065)",
}

const GRADIENT_BACKGROUNDS = Object.keys(GRADIENT_CSS)

const EXPORT_SIZES: Record<AspectRatio, { width: number; height: number }> = {
  "1:1": { width: 1080, height: 1080 },
  "3:4": { width: 1080, height: 1440 },
  "9:16": { width: 1080, height: 1920 },
}

const PREVIEW_MAX_WIDTH = 320

type AspectRatio = "1:1" | "3:4" | "9:16"
type EditorTab = "format" | "backgrounds" | "settings"

interface CardProps {
  text: string
  reference: string
  abbr: string
  gradient: string
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
  const scaledText = Math.round(textSize * (width / PREVIEW_MAX_WIDTH))

  return (
    <div
      style={{
        width,
        height,
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#09090b",
        background: backgroundImageUrl ? undefined : GRADIENT_CSS[gradient] ?? GRADIENT_CSS[GRADIENT_BACKGROUNDS[0]],
        borderRadius: aspectRatio === "9:16" ? 0 : Math.round(12 * (width / PREVIEW_MAX_WIDTH)),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
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
            filter: bgBlur > 0 ? `blur(${bgBlur * (width / PREVIEW_MAX_WIDTH)}px)` : undefined,
            transform: bgBlur > 0 ? "scale(1.1)" : undefined,
          }}
        />
      )}

      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "#000",
          opacity: overlayOpacity / 100,
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
          padding: width * 0.06,
          width: "100%",
          height: "100%",
        }}
      >
        <p
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontStyle: "italic",
            lineHeight: 1.5,
            color: "rgba(255,255,255,0.95)",
            marginBottom: width * 0.04,
            padding: "0 8px",
            fontSize: scaledText,
          }}
        >
          &ldquo;{text}&rdquo;
        </p>

        <p
          style={{
            fontWeight: 500,
            letterSpacing: "0.05em",
            color: "rgba(255,255,255,0.8)",
            fontSize: Math.max(10, scaledText * 0.55),
          }}
        >
          — {reference} | {abbr}
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
    if (open) {
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [open])

  if (!open || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-zinc-950 animate-in fade-in duration-200" role="dialog" aria-modal="true">
      {children}
    </div>,
    document.body
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
  const [selectedGradient, setSelectedGradient] = useState<string>(GRADIENT_BACKGROUNDS[0])
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | undefined>()
  const [unsplashImages, setUnsplashImages] = useState<any[]>([])
  const [isLoadingImages, setIsLoadingImages] = useState(false)
  const [isDownloadingBg, setIsDownloadingBg] = useState(false)

  const [editorTab, setEditorTab] = useState<EditorTab>("backgrounds")
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1")
  const [textSize, setTextSize] = useState<number>(20)
  const [overlayOpacity, setOverlayOpacity] = useState<number>(40)
  const [bgBlur, setBgBlur] = useState<number>(0)
  const [selectedUnsplashId, setSelectedUnsplashId] = useState<string | null>(null)

  const exportRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const exportSize = EXPORT_SIZES[aspectRatio]
  const previewScale = Math.min(1, PREVIEW_MAX_WIDTH / exportSize.width)
  const previewWidth = Math.round(exportSize.width * previewScale)
  const previewHeight = Math.round(exportSize.height * previewScale)

  const cardProps: CardProps = {
    text,
    reference,
    abbr,
    gradient: selectedGradient,
    textSize,
    backgroundImageUrl,
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
    if (text.length > 200) setTextSize(16)
    else if (text.length > 120) setTextSize(18)
    else setTextSize(20)
  }, [open, text])

  const handleSelectUnsplashImage = async (url: string, imageId: string) => {
    setIsDownloadingBg(true)
    try {
      const dataUrl = await urlToDataUrl(url)
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

    let safeBg = backgroundImageUrl
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
      backgroundColor: "#09090b",
      width: exportSize.width,
      height: exportSize.height,
      style: {
        transform: "none",
        margin: "0",
      },
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
        await navigator.share({
          title: `Versículo - ${reference}`,
          text: shareText,
          files: [file],
        })
      } else if (navigator.share) {
        await navigator.share({ title: `Versículo - ${reference}`, text: shareText })
      } else {
        await navigator.clipboard.writeText(shareText)
        alert("Texto copiado al portapapeles.")
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Error al compartir imagen externa:", err)
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
      if (!blob) throw new Error("No se pudo generar el blob")

      const formData = new FormData()
      formData.append("file", blob, `versiculo-${reference.replace(/[^\w\d-]/g, "-")}.png`)

      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData })
      if (!uploadRes.ok) throw new Error("Error subiendo la imagen")
      const uploadData = await uploadRes.json()
      const imageUrl = uploadData.url

      const postContent = `**Versículo:** ${reference}\n\n"${text}"\n\n![Versículo](${imageUrl})`

      const postRes = await fetch("/api/feed/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: postContent }),
      })

      if (!postRes.ok) throw new Error("Error creando publicación en el feed")

      alert("¡Publicado en la Comunidad con éxito!")
      onOpenChange(false)
    } catch (err) {
      console.error("Error compartiendo en comunidad:", err)
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
      setBackgroundImageUrl(reader.result as string)
      setIsDownloadingBg(false)
    }
    reader.onerror = () => setIsDownloadingBg(false)
    reader.readAsDataURL(file)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="flex h-full w-full flex-col bg-zinc-950 text-white">
        {/* Nodo oculto de exportación a resolución completa */}
        <div
          aria-hidden
          style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none", opacity: 0 }}
        >
          <div ref={exportRef}>
            <VerseImageCard {...cardProps} />
          </div>
        </div>

        <div className="flex w-full items-center justify-between p-4 bg-zinc-900 border-b border-white/10 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="text-white hover:bg-white/10 rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
          <h2 className="text-sm font-semibold tracking-wide uppercase">Crear Imagen</h2>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownloadImage}
              disabled={isExporting || isDownloadingBg}
              className="text-white hover:bg-white/10 rounded-full"
              title="Descargar"
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex items-center justify-center bg-primary text-white hover:bg-primary/90 rounded-full h-10 w-10 disabled:opacity-50"
                disabled={isExporting || isDownloadingBg}
                title="Compartir"
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px] rounded-xl border-primary/10 bg-zinc-900 text-white backdrop-blur-xl">
                <DropdownMenuItem onClick={handleShareImageCommunity} className="rounded-lg cursor-pointer hover:bg-white/10">
                  Compartir en Comunidad
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareImageExternal} className="rounded-lg cursor-pointer hover:bg-white/10">
                  Compartir Externo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center bg-zinc-950 p-4 overflow-y-auto min-h-[50vh]">
          {isDownloadingBg ? (
            <div className="flex flex-col items-center gap-2 text-white/50">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-xs">Cargando imagen de alta calidad...</p>
            </div>
          ) : (
            <div style={{ width: previewWidth, height: previewHeight }}>
              <div
                style={{
                  transform: `scale(${previewScale})`,
                  transformOrigin: "top left",
                  width: exportSize.width,
                  height: exportSize.height,
                }}
              >
                <VerseImageCard {...cardProps} />
              </div>
            </div>
          )}
        </div>

        <div className="w-full bg-zinc-900 border-t border-white/10 shrink-0 flex flex-col h-[35vh]">
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {editorTab === "format" && (
              <div className="flex items-center justify-center gap-4 h-full">
                {(["1:1", "3:4", "9:16"] as AspectRatio[]).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 transition-all rounded-lg p-2 border-2",
                      aspectRatio === ratio ? "border-primary bg-primary/10 text-primary" : "border-transparent text-white/60 hover:text-white",
                    )}
                  >
                    <div
                      className={cn(
                        "border-2 border-current rounded-sm",
                        ratio === "1:1" ? "w-8 h-8" : ratio === "3:4" ? "w-6 h-8" : "w-5 h-9",
                      )}
                    />
                    <span className="text-xs font-semibold">{ratio}</span>
                  </button>
                ))}
              </div>
            )}

            {editorTab === "backgrounds" && (
              <div className="grid grid-cols-3 gap-2 h-full auto-rows-[100px]">
                <button
                  onClick={() => {
                    setBackgroundImageUrl(undefined)
                    setSelectedGradient(GRADIENT_BACKGROUNDS[0])
                    setSelectedUnsplashId(null)
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg border-2 bg-gradient-to-b from-zinc-800 to-zinc-900 transition-all",
                    !backgroundImageUrl ? "border-primary" : "border-transparent",
                  )}
                >
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 mb-1" />
                  <span className="text-[10px] font-medium text-white/80">Colores</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-transparent bg-white/5 hover:bg-white/10 transition-all"
                >
                  <Upload className="h-6 w-6 text-white/70 mb-1" />
                  <span className="text-[10px] font-medium text-white/80">Subir</span>
                </button>
                <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleLocalImageUpload} />

                {isLoadingImages ? (
                  <div className="flex items-center justify-center rounded-lg bg-white/5 border-2 border-transparent">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : (
                  unsplashImages.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => handleSelectUnsplashImage(img.url, img.id)}
                      className={cn(
                        "relative rounded-lg overflow-hidden border-2 transition-all",
                        selectedUnsplashId === img.id ? "border-primary shadow-lg shadow-primary/20 scale-[1.02]" : "border-transparent opacity-80 hover:opacity-100",
                      )}
                    >
                      <img src={img.thumb} alt="Unsplash" className="object-cover h-full w-full" />
                    </button>
                  ))
                )}
              </div>
            )}

            {editorTab === "settings" && (
              <div className="flex flex-col gap-6 pt-2 h-full max-w-md mx-auto w-full">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-white/80">Tamaño de Letra</label>
                    <span className="text-xs text-primary font-mono">{textSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="14"
                    max="40"
                    step="1"
                    value={textSize}
                    onChange={(e) => setTextSize(Number(e.target.value))}
                    className="w-full accent-primary h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-white/80">Opacidad Oscura</label>
                    <span className="text-xs text-primary font-mono">{overlayOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    step="5"
                    value={overlayOpacity}
                    onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                    className="w-full accent-primary h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-white/80">Difuminar (Blur)</label>
                    <span className="text-xs text-primary font-mono">{bgBlur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="1"
                    value={bgBlur}
                    onChange={(e) => setBgBlur(Number(e.target.value))}
                    className="w-full accent-primary h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-around p-3 border-t border-white/10 bg-zinc-950 pb-safe">
            <button
              onClick={() => setEditorTab("format")}
              className={cn("flex flex-col items-center gap-1 transition-colors", editorTab === "format" ? "text-primary" : "text-white/50 hover:text-white")}
            >
              <Layout className="h-5 w-5" />
              <span className="text-[10px] font-medium">Formato</span>
            </button>

            <button
              onClick={() => setEditorTab("backgrounds")}
              className={cn("flex flex-col items-center gap-1 transition-colors", editorTab === "backgrounds" ? "text-primary" : "text-white/50 hover:text-white")}
            >
              <ImageIcon className="h-5 w-5" />
              <span className="text-[10px] font-medium">Fondos</span>
            </button>

            <button
              onClick={() => setEditorTab("settings")}
              className={cn("flex flex-col items-center gap-1 transition-colors", editorTab === "settings" ? "text-primary" : "text-white/50 hover:text-white")}
            >
              <Settings2 className="h-5 w-5" />
              <span className="text-[10px] font-medium">Ajustes</span>
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
