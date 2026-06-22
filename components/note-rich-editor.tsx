"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTheme } from "next-themes"
import { getEditorHtml } from "@/lib/note-editor-html"
import { DEFAULT_EDITOR_COLORS, getNoteEditorColors } from "@/lib/note-editor-theme"

function convertMarkdownToHtml(text: string): string {
  if (!text) return ""
  if (
    text.includes("<p>") ||
    text.includes("<div>") ||
    text.includes("<blockquote>") ||
    text.includes("<table>") ||
    text.includes("<span>") ||
    text.includes("<b>") ||
    text.includes("<strong>")
  ) {
    return text
  }

  const lines = text.split("\n")
  let inQuote = false
  let html = ""

  lines.forEach((line) => {
    const cleanLine = line.trim()
    if (cleanLine.startsWith(">")) {
      if (!inQuote) {
        html += "<blockquote>"
        inQuote = true
      }
      const quoteText = cleanLine.substring(1).trim().replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      html += quoteText + "<br/>"
    } else {
      if (inQuote) {
        html += "</blockquote>"
        inQuote = false
      }
      if (cleanLine === "") {
        html += "<br/>"
      } else {
        const paragraphText = cleanLine.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        html += `<p>${paragraphText}</p>`
      }
    }
  })

  if (inQuote) html += "</blockquote>"
  return html
}

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
      convertMarkdownToHtml(content),
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
      onLoad={() => {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ type: "measureHeight" }),
          "*",
        )
      }}
    />
  )
}

interface NoteRichEditorProps {
  content: string
  onChange: (html: string) => void
  onInsertVerse?: () => void
  onInsertDictionary?: () => void
  className?: string
}

export const NoteRichEditor = React.forwardRef<HTMLIFrameElement, NoteRichEditorProps>(function NoteRichEditor(
  {
    content,
    onChange,
    onInsertVerse,
    onInsertDictionary,
    className,
  },
  ref,
) {
  const { resolvedTheme } = useTheme()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const initialHtmlRef = useRef<string | null>(null)
  const contentRef = useRef(content)

  React.useImperativeHandle(ref, () => iframeRef.current as HTMLIFrameElement)

  if (!initialHtmlRef.current) {
    initialHtmlRef.current = getEditorHtml(
      getNoteEditorColors(),
      convertMarkdownToHtml(content),
      "Default",
      {},
      false,
      DEFAULT_EDITOR_COLORS,
    )
  }

  const sendAction = useCallback((action: Record<string, unknown>) => {
    const win = iframeRef.current?.contentWindow as (Window & { handleAction?: (s: string) => void }) | null
    win?.handleAction?.(JSON.stringify(action))
  }, [])

  useEffect(() => {
    contentRef.current = content
  }, [content])

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

  useEffect(() => {
    sendAction({ type: "updateContent", value: convertMarkdownToHtml(content) })
  // ponytail: only refresh editor skin on theme change, not on every keystroke
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTheme])

  return (
    <iframe
      ref={iframeRef}
      title="Editor de nota"
      srcDoc={initialHtmlRef.current}
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
