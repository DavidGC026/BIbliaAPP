"use client"

import {
  ArrowLeft,
  Check,
  Download,
  Edit2,
  Eye,
  Image as ImageIcon,
  Loader2,
  MoreHorizontal,
  Save,
  Share2,
  Trash2,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export type NoteEditorSaveState = "saved" | "pending" | "saving"

type Props = {
  title: string
  onTitleChange: (title: string) => void
  saveState: NoteEditorSaveState
  savedAt: string | null
  wordCount: number
  previewMode: boolean
  imageEditMode: boolean
  onBack: () => void
  onSave: () => void
  onTogglePreview: () => void
  onShare: () => void
  onExportPdf: () => void
  onDelete: () => void
}

const STATUS_LABEL: Record<NoteEditorSaveState, string> = {
  saved: "Guardado automáticamente",
  pending: "Cambios pendientes",
  saving: "Autoguardando…",
}

/** Cabecera compacta inspirada en desktop; no conoce API ni persistencia. */
export function NoteEditorHeader({
  title,
  onTitleChange,
  saveState,
  savedAt,
  wordCount,
  previewMode,
  imageEditMode,
  onBack,
  onSave,
  onTogglePreview,
  onShare,
  onExportPdf,
  onDelete,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault()
        onSave()
      }
      if (event.key === "Escape") setMenuOpen(false)
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    document.addEventListener("pointerdown", onPointerDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("pointerdown", onPointerDown)
    }
  }, [onSave])

  return (
    <header className="web-note-header">
      <button type="button" className="web-note-icon-button" onClick={onBack} aria-label="Volver a la libreta" title="Volver a la libreta">
        <ArrowLeft aria-hidden="true" />
      </button>

      <input
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        placeholder="Título de la nota"
        aria-label="Título de la nota"
        disabled={imageEditMode}
        className="web-note-title-input"
      />

      <div className={cn("web-note-status", `is-${saveState}`)} aria-live="polite">
        {imageEditMode ? <ImageIcon aria-hidden="true" /> : null}
        <span>{imageEditMode ? "Editando imagen" : STATUS_LABEL[saveState]}</span>
        <span className="web-note-status-separator">·</span>
        <span>{wordCount} {wordCount === 1 ? "palabra" : "palabras"}</span>
        {savedAt && saveState === "saved" ? <span className="web-note-saved-time">· {savedAt}</span> : null}
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={saveState === "saving"}
        className={cn("web-note-save-button", `is-${saveState}`)}
        aria-label="Guardar nota"
        title="Guardar (Ctrl+S)"
      >
        {saveState === "saving" ? <Loader2 className="animate-spin" /> : saveState === "saved" ? <Check /> : <Save />}
        <span>{saveState === "saving" ? "Guardando…" : saveState === "saved" ? "Guardado" : "Guardar"}</span>
      </button>

      <div ref={menuRef} className="web-note-actions">
        <button
          type="button"
          className="web-note-icon-button"
          aria-label="Más acciones"
          title="Más acciones"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
        >
          <MoreHorizontal aria-hidden="true" />
        </button>
        {menuOpen ? (
          <div className="web-note-actions-menu" role="menu">
            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onTogglePreview() }}>
              {previewMode ? <Edit2 /> : <Eye />}
              {previewMode ? "Volver a editar" : "Vista previa"}
            </button>
            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onShare() }}>
              <Share2 /> Compartir
            </button>
            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onExportPdf() }}>
              <Download /> Exportar PDF
            </button>
            <div className="web-note-actions-divider" />
            <button type="button" role="menuitem" className="is-danger" onClick={() => { setMenuOpen(false); onDelete() }}>
              <Trash2 /> Eliminar nota
            </button>
          </div>
        ) : null}
      </div>
    </header>
  )
}
