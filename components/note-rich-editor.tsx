"use client"

import type { Editor } from "@tiptap/core"
import dynamic from "next/dynamic"
import { useTheme } from "next-themes"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FontPickerDialog } from "@/components/notes/tiptap/font-picker-dialog"
import { TableInsertDialog } from "@/components/notes/tiptap/table-insert-dialog"
import { useNoteImageUpload } from "@/components/notes/tiptap/use-note-image-upload"
import { getEditorHtml } from "@/lib/note-editor-html"
import { DEFAULT_EDITOR_COLORS, getNoteEditorColors } from "@/lib/note-editor-theme"
import { normalizeNoteContentForEditor } from "@/lib/note-content"

// El editor añade ProseMirror al bundle: solo se descarga al entrar a una nota.
const TiptapNoteEditor = dynamic(
  () => import("@/components/notes/tiptap/tiptap-note-editor").then((module) => module.TiptapNoteEditor),
  {
    ssr: false,
    loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Preparando editor…</div>,
  },
)

interface NoteContentProps {
  content: string
  className?: string
}

/** Vista de lectura estable; no carga Tiptap ni añade controles al contenido. */
export function NoteContent({ content, className }: NoteContentProps) {
  const { resolvedTheme } = useTheme()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(200)

  const html = useMemo(() => getEditorHtml(
    getNoteEditorColors(),
    normalizeNoteContentForEditor(content),
    "Default",
    {},
    true,
    DEFAULT_EDITOR_COLORS,
  ), [content, resolvedTheme])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data
        if (data.type === "onHeightChange" && data.height > 0) setHeight(data.height + 16)
      } catch {
        // Un mensaje ajeno al editor no requiere accion.
      }
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [])

  if (!content?.trim()) return <p className="text-sm italic text-muted-foreground">Sin contenido</p>

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

export type NoteRichEditorHandle = {
  getHtml: () => string
  focus: () => void
  insertHtml: (html: string) => void
}

interface NoteRichEditorProps {
  content: string
  contentVersion: string
  onChange: (html: string) => void
  onInsertVerse?: () => void
  onInsertDictionary?: () => void
  onImageEditMode?: (active: boolean) => void
  className?: string
}

/**
 * Adaptador entre el editor de dominio y la pantalla de notas.
 * Orquesta archivos/dialogos, pero delega documento y cinta a TiptapNoteEditor.
 */
export const NoteRichEditor = React.forwardRef<NoteRichEditorHandle, NoteRichEditorProps>(function NoteRichEditor(
  {
    content,
    contentVersion,
    onChange,
    onInsertVerse,
    onInsertDictionary,
    onImageEditMode,
    className,
  },
  ref,
) {
  const editorRef = useRef<Editor | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const pendingBackgroundImageRef = useRef(false)
  const [fontDialogOpen, setFontDialogOpen] = useState(false)
  const [tableDialogOpen, setTableDialogOpen] = useState(false)
  const [activeFont, setActiveFont] = useState("Default")
  const { uploading, upload } = useNoteImageUpload()
  const setEditor = useCallback((editor: Editor | null) => { editorRef.current = editor }, [])

  React.useImperativeHandle(ref, () => ({
    getHtml: () => editorRef.current?.getHTML() ?? normalizeNoteContentForEditor(content),
    focus: () => editorRef.current?.commands.focus(),
    insertHtml: (html) => { editorRef.current?.chain().focus().insertContent(html).run() },
  }), [content])

  const pickFont = useCallback((font: string) => {
    const editor = editorRef.current
    if (!editor) return
    setActiveFont(font)
    if (font === "Default") editor.chain().focus().unsetFontFamily().run()
    else editor.chain().focus().setFontFamily(font).run()
  }, [])

  return (
    <div className="relative h-full min-h-0 w-full">
      <TiptapNoteEditor
        content={content}
        contentVersion={contentVersion}
        onChange={onChange}
        onInsertVerse={onInsertVerse ?? (() => undefined)}
        onInsertDictionary={onInsertDictionary ?? (() => undefined)}
        onPickImage={() => {
          pendingBackgroundImageRef.current = false
          imageInputRef.current?.click()
        }}
        onPickBackgroundImage={() => {
          pendingBackgroundImageRef.current = true
          imageInputRef.current?.click()
        }}
        onPickTable={() => setTableDialogOpen(true)}
        onPickFont={() => setFontDialogOpen(true)}
        onReady={setEditor}
        onImageEditMode={onImageEditMode}
        className={className}
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
          const url = await upload(file)
          if (!url) return
          const background = pendingBackgroundImageRef.current
          pendingBackgroundImageRef.current = false
          editorRef.current?.chain().focus().insertContent({
            type: "imageBlock",
            attrs: { src: url, alt: file.name || "Imagen de la nota", background },
          }).run()
        }}
      />
      {uploading ? (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground shadow-lg">
          Subiendo imagen…
        </div>
      ) : null}
      <FontPickerDialog
        open={fontDialogOpen}
        activeFont={activeFont}
        onClose={() => setFontDialogOpen(false)}
        onSelect={pickFont}
      />
      <TableInsertDialog
        open={tableDialogOpen}
        onClose={() => setTableDialogOpen(false)}
        onInsert={(options) => editorRef.current?.chain().focus().insertTable(options).run()}
      />
    </div>
  )
})

export function requestEditorHtml(editor: NoteRichEditorHandle | null): Promise<string> {
  return Promise.resolve(editor?.getHtml() ?? "")
}
