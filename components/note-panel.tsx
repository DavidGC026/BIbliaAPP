"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { fetcher } from "@/lib/fetcher"
import type { JoplinNote } from "@/lib/types"
import { X, Save } from "lucide-react"

interface NotePanelProps {
  noteId: string | null
  reference: string | null
  onClose: () => void
  onSessionExpired: () => void
}

export function NotePanel({ noteId, reference, onClose, onSessionExpired }: NotePanelProps) {
  const { data, isLoading, mutate, error } = useSWR<{ note: JoplinNote }>(
    noteId ? `/api/notes/${noteId}` : null,
    fetcher,
  )
  const [body, setBody] = useState("")
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    if (data?.note) setBody(data.note.body ?? "")
  }, [data?.note])

  async function handleSave() {
    if (!noteId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(localStorage.getItem("joplin_session") ? { "x-joplin-session": localStorage.getItem("joplin_session")! } : {}),
        },
        body: JSON.stringify({ body }),
      })
      if (!res.ok) {
        const err = await res.json()
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("joplin_session")
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


  if (!noteId) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <p className="text-pretty text-sm leading-relaxed">
          Selecciona un versículo y abre o crea una nota para verla aquí.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {data?.note?.title ?? reference ?? "Nota"}
          </p>
          <p className="text-xs text-muted-foreground">
            {noteId.startsWith("local:") ? "Nota local" : "Nota de Joplin"}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar panel">
          <X className="size-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando nota…</p>
        ) : (
          <Textarea
            value={body}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
            placeholder="Escribe tu nota en Markdown... Arrastra los versículos de la Biblia aquí para insertarlos..."
            className="min-h-80 resize-none font-mono text-sm leading-relaxed"
          />
        )}
      </div>

      <footer className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
        <span className="text-xs text-muted-foreground">
          Sesión de Joplin activa
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {savedAt ? `Guardado ${savedAt}` : "Cambios sin guardar"}
          </span>
          <Button onClick={handleSave} disabled={saving || isLoading} size="sm">
            <Save className="size-4" />
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </footer>
    </div>
  )
}
