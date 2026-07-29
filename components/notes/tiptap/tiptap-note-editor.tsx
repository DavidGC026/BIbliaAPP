"use client"

import type { Editor } from "@tiptap/core"
import { EditorContent, useEditor } from "@tiptap/react"
import { useEffect, useMemo, useReducer, useRef, useState } from "react"
import { DEFAULT_EDITOR_COLORS } from "@/lib/note-editor-theme"
import { normalizeNoteContentForEditor } from "@/lib/note-content"
import { buildNoteExtensions } from "@/lib/tiptap/extensions"
import { clearNodeSelection } from "./editor-commands"
import { selectedImage } from "./image-commands"
import { NoteEditorRibbon } from "./note-editor-ribbon"
import type { RibbonContext } from "./ribbon-types"

type Props = {
  content: string
  contentVersion: string
  onChange: (html: string) => void
  onInsertVerse: () => void
  onInsertDictionary: () => void
  onPickImage: () => void
  onPickBackgroundImage: () => void
  onPickTable: () => void
  onPickFont: () => void
  onReady: (editor: Editor | null) => void
  onImageEditMode?: (active: boolean) => void
  className?: string
}

/** Monta Tiptap y conecta sus contratos; no conoce API, guardado ni modales. */
export function TiptapNoteEditor({
  content,
  contentVersion,
  onChange,
  onInsertVerse,
  onInsertDictionary,
  onPickImage,
  onPickBackgroundImage,
  onPickTable,
  onPickFont,
  onReady,
  onImageEditMode,
  className,
}: Props) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const initialContent = useRef(normalizeNoteContentForEditor(content))
  const [backgroundMode, setBackgroundMode] = useState(false)
  const [revision, bumpRevision] = useReducer((value: number) => value + 1, 0)
  const extensions = useMemo(() => buildNoteExtensions(), [])

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: initialContent.current,
    editorProps: {
      attributes: {
        class: "note-tiptap-prosemirror",
        "aria-label": "Contenido de la nota",
      },
    },
    onUpdate: ({ editor: instance }) => onChangeRef.current(instance.getHTML()),
  })

  useEffect(() => {
    if (!editor) return
    editor.commands.setContent(normalizeNoteContentForEditor(content), { emitUpdate: false })
  // contentVersion es la señal explícita del anfitrión; content cambia también al teclear.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentVersion, editor])

  useEffect(() => {
    onReady(editor ?? null)
    return () => onReady(null)
  }, [editor, onReady])

  useEffect(() => {
    if (!editor) return
    const update = () => bumpRevision()
    editor.on("selectionUpdate", update)
    editor.on("transaction", update)
    return () => {
      editor.off("selectionUpdate", update)
      editor.off("transaction", update)
    }
  }, [editor])

  useEffect(() => {
    onImageEditMode?.(!!editor && selectedImage(editor) !== null)
  }, [editor, onImageEditMode, revision])

  const context = useMemo<RibbonContext | null>(() => editor ? ({
    editor,
    colors: DEFAULT_EDITOR_COLORS,
    backgroundMode,
    onToggleBackgroundMode: () => setBackgroundMode((value) => !value),
    onInsertVerse,
    onInsertDictionary,
    onPickImage,
    onPickBackgroundImage,
    onPickTable,
    onPickFont,
    onClearSelection: () => clearNodeSelection(editor),
  }) : null, [
    backgroundMode,
    editor,
    onInsertDictionary,
    onInsertVerse,
    onPickFont,
    onPickBackgroundImage,
    onPickImage,
    onPickTable,
  ])

  if (!editor || !context) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Preparando editor…</div>
  }

  return (
    <div className={`note-tiptap-shell ${backgroundMode ? "is-background-mode" : ""} ${className ?? ""}`}>
      <NoteEditorRibbon context={context} revision={revision} />
      <div className="note-tiptap-document">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
