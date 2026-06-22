"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTheme } from "next-themes"
import { getEditorHtml } from "@/lib/note-editor-html"
import { DEFAULT_EDITOR_COLORS, getNoteEditorColors } from "@/lib/note-editor-theme"
import { normalizeNoteContentForEditor } from "@/lib/note-content"

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
  onInsertDictionary?: () => void
  className?: string
}

export const NoteRichEditor = React.forwardRef<HTMLIFrameElement, NoteRichEditorProps>(function NoteRichEditor(
  {
    content,
    contentVersion,
    onChange,
    onInsertVerse,
    onInsertDictionary,
    className,
  },
  ref,
) {
  const { resolvedTheme } = useTheme()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  React.useImperativeHandle(ref, () => iframeRef.current as HTMLIFrameElement)

  const srcDoc = useMemo(() => {
    return getEditorHtml(
      getNoteEditorColors(),
      normalizeNoteContentForEditor(content),
      "Default",
      {},
      false,
      DEFAULT_EDITOR_COLORS,
    )
  }, [content, contentVersion, resolvedTheme])

  const sendAction = useCallback((action: Record<string, unknown>) => {
    const win = iframeRef.current?.contentWindow as (Window & { handleAction?: (s: string) => void }) | null
    win?.handleAction?.(JSON.stringify(action))
  }, [])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return
      let data: { type?: string; html?: string }
      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data
      } catch {
        return
      }

      if (data.type === "onChange" && typeof data.html === "string") {
        onChange(data.html)
      } else if (data.type === "openVerseModal") {
        onInsertVerse?.()
      } else if (data.type === "openDictionaryModal") {
        onInsertDictionary?.()
      }
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [onChange, onInsertVerse, onInsertDictionary])

  return (
    <iframe
      key={contentVersion}
      ref={iframeRef}
      title="Editor de nota"
      srcDoc={srcDoc}
      className={className}
      style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      sandbox="allow-scripts allow-same-origin"
    />
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
    }, 500)

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
