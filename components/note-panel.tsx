"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { fetcher } from "@/lib/fetcher"
import type { JoplinNote } from "@/lib/types"
import { normalizeVerseNoteForEditor } from "@/lib/note-content"
import { X, Save, Trash2 } from "lucide-react"

interface NotePanelProps {
  noteId: string | null
  reference: string | null
  onClose: () => void
  onDeleted?: () => void
  onSessionExpired: () => void
}

export function NotePanel({ noteId, reference, onClose, onDeleted, onSessionExpired }: NotePanelProps) {
  const { data, isLoading, mutate, error } = useSWR<{ note: JoplinNote }>(
    noteId ? `/api/notes/${noteId}` : null,
    fetcher,
  )
  const [body, setBody] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    if (data?.note) setBody(normalizeVerseNoteForEditor(data.note.body ?? ""))
  }, [data?.note])

  useEffect(() => {
    if (error && (error.status === 401 || error.status === 403)) {
      localStorage.removeItem("biblia_token")
      onSessionExpired()
    }
  }, [error, onSessionExpired])

  async function handleSave() {
    if (!noteId) return
    setSaving(true)
    const token = localStorage.getItem("biblia_token")
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          body,
          title: data?.note?.title || reference || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("biblia_token")
          onSessionExpired()
        }
        throw new Error(err.error)
      }
      await mutate()
      setSavedAt(new Date().toLocaleTimeString())
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!noteId) return
    if (!confirm(`¿Eliminar la nota de ${reference ?? "este versículo"}?`)) return
    setDeleting(true)
    const token = localStorage.getItem("biblia_token")
    try {
      const res = await fetch(`/api/links?id=${noteId}`, {
        method: "DELETE",
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
      })
      if (!res.ok) {
        const err = await res.json()
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("biblia_token")
          onSessionExpired()
        }
        throw new Error(err.error)
      }
      onDeleted?.()
      onClose()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al eliminar")
    } finally {
      setDeleting(false)
    }
  }

  if (!noteId) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <p className="text-pretty text-sm leading-relaxed">
          Selecciona un versículo y pulsa el botón + para crear o abrir una nota.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 bg-card/40">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {data?.note?.title ?? reference ?? "Nota"}
          </p>
          <p className="text-xs text-muted-foreground">
            Nota de estudio
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={deleting || isLoading}
            className="text-destructive hover:bg-destructive/10"
            aria-label="Eliminar nota"
          >
            <Trash2 className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar panel">
            <X className="size-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando nota…</p>
        ) : (
          <Textarea
            value={body}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
            placeholder="Escribe tu nota aquí…"
            className="min-h-80 resize-none font-sans text-base leading-relaxed focus-visible:ring-0 border-none bg-transparent p-0"
          />
        )}
      </div>

      <footer className="flex items-center justify-between gap-2 border-t border-border px-4 py-3 bg-card/20">
        <span className="text-xs text-muted-foreground">
          Guardado en tu cuenta
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {savedAt ? `Guardado ${savedAt}` : "Cambios sin guardar"}
          </span>
          <Button onClick={handleSave} disabled={saving || isLoading || deleting} size="sm">
            <Save className="size-4" />
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </footer>
    </div>
  )
}
