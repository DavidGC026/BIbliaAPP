"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTheme } from "next-themes"
import { getEditorHtml } from "@/lib/note-editor-html"
import { DEFAULT_EDITOR_COLORS, getNoteEditorColors } from "@/lib/note-editor-theme"
import { normalizeNoteContentForEditor } from "@/lib/note-content"
import { cn } from "@/lib/utils"

const NOTE_FONT_OPTIONS = [
  { id: "Default", name: "Predeterminada", category: "Sistema", family: "system-ui, sans-serif" },
  { id: "serif", name: "Serif", category: "Sistema", family: "serif" },
  { id: "monospace", name: "Monospace", category: "Sistema", family: "monospace" },
  { id: "Lora", name: "Lora", category: "Serif", family: "Lora, Georgia, serif" },
  { id: "PlayfairDisplay", name: "Playfair Display", category: "Serif", family: "Playfair Display, Georgia, serif" },
  { id: "Merriweather", name: "Merriweather", category: "Serif", family: "Merriweather, Georgia, serif" },
  { id: "Inter", name: "Inter", category: "Sans-serif", family: "Inter, system-ui, sans-serif" },
  { id: "Montserrat", name: "Montserrat", category: "Sans-serif", family: "Montserrat, system-ui, sans-serif" },
  { id: "Roboto", name: "Roboto", category: "Sans-serif", family: "Roboto, system-ui, sans-serif" },
  { id: "Outfit", name: "Outfit", category: "Sans-serif", family: "Outfit, system-ui, sans-serif" },
  { id: "Poppins", name: "Poppins", category: "Sans-serif", family: "Poppins, system-ui, sans-serif" },
  { id: "Oswald", name: "Oswald", category: "Sans-serif", family: "Oswald, system-ui, sans-serif" },
  { id: "FiraCode", name: "Fira Code", category: "Monospace", family: "Fira Code, monospace" },
  { id: "JetBrainsMono", name: "JetBrains Mono", category: "Monospace", family: "JetBrains Mono, monospace" },
]

interface NoteContentProps {
  content: string
  className?: string
}

export function NoteContent({ content, className }: NoteContentProps) {
  const { resolvedTheme } = useTheme()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(200)

  const html = useMemo(() => {
    const colors = getNoteEditorColors()
    return getEditorHtml(
      colors,
      normalizeNoteContentForEditor(content),
      "Default",
      {},
      true,
      DEFAULT_EDITOR_COLORS,
    )
  }, [content, resolvedTheme])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data
        if (data.type === "onHeightChange" && data.height > 0) {
          setHeight(data.height + 16)
        }
      } catch {
        // ignore
      }
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [])

  if (!content?.trim()) {
    return <p className="text-sm text-muted-foreground italic">Sin contenido</p>
  }

  return (
    <iframe
      ref={iframeRef}
      title="Vista previa de nota"
      srcDoc={html}
      className={className}
      style={{ width: "100%", height, border: "none", display: "block" }}
      sandbox="allow-scripts allow-same-origin"
    />
  )
}

interface NoteRichEditorProps {
  content: string
  /** Cambia cuando llega la nota del servidor para remontar el iframe con HTML correcto */
  contentVersion: string
  onChange: (html: string) => void
  onInsertVerse?: () => void
  onInsertReferences?: () => void
  onInsertDictionary?: () => void
  className?: string
}

export const NoteRichEditor = React.forwardRef<HTMLIFrameElement, NoteRichEditorProps>(function NoteRichEditor(
  {
    content,
    contentVersion,
    onChange,
    onInsertVerse,
    onInsertReferences,
    onInsertDictionary,
    className,
  },
  ref,
) {
  const { resolvedTheme } = useTheme()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [fontModalOpen, setFontModalOpen] = useState(false)
  const [activeFont, setActiveFont] = useState("Default")

  React.useImperativeHandle(ref, () => iframeRef.current as HTMLIFrameElement)

  // ponytail: srcDoc only on contentVersion change — updating `content` while typing must not reload the iframe
  const initialContentRef = useRef(content)
  const lastVersionRef = useRef(contentVersion)
  if (lastVersionRef.current !== contentVersion) {
    lastVersionRef.current = contentVersion
    initialContentRef.current = content
  }

  const srcDoc = useMemo(() => {
    return getEditorHtml(
      getNoteEditorColors(),
      normalizeNoteContentForEditor(initialContentRef.current),
      "Default",
      {},
      false,
      DEFAULT_EDITOR_COLORS,
    )
  }, [contentVersion, resolvedTheme])

  const sendAction = useCallback((action: Record<string, unknown>) => {
    const win = iframeRef.current?.contentWindow as (Window & { handleAction?: (s: string) => void }) | null
    win?.handleAction?.(JSON.stringify(action))
  }, [])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return
      let data: { type?: string; html?: string; active?: boolean }
      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data
      } catch {
        return
      }

      if (data.type === "onChange" && typeof data.html === "string") {
        onChange(data.html)
      } else if (data.type === "openVerseModal") {
        onInsertVerse?.()
      } else if (data.type === "openFontModal") {
        setFontModalOpen(true)
      } else if (data.type === "openReferenceModal") {
        onInsertReferences?.()
      } else if (data.type === "openDictionaryModal") {
        onInsertDictionary?.()
      } else if (data.type === "openImagePicker") {
        imageInputRef.current?.click()
      }
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [onChange, onInsertVerse, onInsertReferences, onInsertDictionary])

  return (
    <div className="relative h-full w-full">
      <iframe
        key={contentVersion}
        ref={iframeRef}
        title="Editor de nota"
        srcDoc={srcDoc}
        className={className}
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
        sandbox="allow-scripts allow-same-origin"
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0]
          event.target.value = ""
          if (!file) return
          setUploadingImage(true)
          try {
            const formData = new FormData()
            formData.append("file", file)
            formData.append("purpose", "other")
            const token = localStorage.getItem("biblia_token")
            const res = await fetch("/api/upload", {
              method: "POST",
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              body: formData,
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.error || "No se pudo subir la imagen")
            const imageUrl = data.filename
              ? `${window.location.origin}/uploads/${encodeURIComponent(data.filename)}`
              : data.url
                ? `${window.location.origin}${data.url}`
                : ""
            if (!imageUrl) throw new Error("La subida no devolvió una URL válida")
            sendAction({ type: "insertImage", value: imageUrl })
          } catch (error) {
            window.alert(error instanceof Error ? error.message : "No se pudo insertar la imagen")
          } finally {
            setUploadingImage(false)
          }
        }}
      />
      {uploadingImage ? (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground shadow-lg">
          Subiendo imagen...
        </div>
      ) : null}
      {fontModalOpen ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[86%] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
              <div>
                <h3 className="text-sm font-extrabold text-foreground">Fuente de la nota</h3>
                <p className="text-xs text-muted-foreground">Aplica a la selección o a todo el contenido.</p>
              </div>
              <button
                type="button"
                onClick={() => setFontModalOpen(false)}
                className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                Cerrar
              </button>
            </div>
            <div className="grid gap-2 overflow-y-auto p-3 sm:grid-cols-2">
              {NOTE_FONT_OPTIONS.map((font) => (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => {
                    setActiveFont(font.id)
                    sendAction({ type: "setFont", value: font.id })
                    setFontModalOpen(false)
                  }}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors hover:bg-muted/50",
                    activeFont === font.id ? "border-primary bg-primary/10" : "border-border bg-background",
                  )}
                >
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {font.category}
                  </span>
                  <span className="mt-1 block text-base font-semibold text-foreground" style={{ fontFamily: font.family }}>
                    {font.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
})

export function requestEditorHtml(iframe: HTMLIFrameElement | null): Promise<string> {
  return new Promise((resolve) => {
    const win = iframe?.contentWindow
    if (!win) {
      resolve("")
      return
    }

    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", onMessage)
      resolve("")
    }, 5000)

    const onMessage = (event: MessageEvent) => {
      if (event.source !== win) return
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data
        if (data.type === "getHtmlResponse" && typeof data.html === "string") {
          window.clearTimeout(timeout)
          window.removeEventListener("message", onMessage)
          resolve(data.html)
        }
      } catch {
        // ignore
      }
    }

    window.addEventListener("message", onMessage)
    ;(win as Window & { handleAction?: (s: string) => void }).handleAction?.(
      JSON.stringify({ type: "getHtml" }),
    )
  })
}

export function insertHtmlIntoNoteContent(current: string, html: string): string {
  const base = normalizeNoteContentForEditor(current)
  if (!base) return html
  return base + html
}
