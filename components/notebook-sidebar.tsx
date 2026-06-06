"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  BookOpen,
  FileText,
  Loader2,
  FolderPlus,
} from "lucide-react"

interface Notebook {
  id: number
  name: string
  createdAt: string
}

interface NotebookNote {
  id: number
  notebookId: number
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

interface NotebookSidebarProps {
  editingNote: { id: number; title: string; content: string } | null
  setEditingNote: (note: { id: number; title: string; content: string } | null) => void
}

export function NotebookSidebar({ editingNote, setEditingNote }: NotebookSidebarProps) {
  const { data: notebooksData, mutate: mutateNotebooks } = useSWR<{ notebooks: Notebook[] }>(
    "/api/notebooks",
    fetcher
  )
  const notebooks = notebooksData?.notebooks ?? []

  const [activeNotebookId, setActiveNotebookId] = useState<number | null>(null)
  const [newNotebookName, setNewNotebookName] = useState("")
  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false)

  const { data: notesData, mutate: mutateNotes, isLoading: notesLoading } = useSWR<{ notes: NotebookNote[] }>(
    activeNotebookId ? `/api/notebooks/${activeNotebookId}/notes` : null,
    fetcher
  )
  const notes = notesData?.notes ?? []

  const [newNoteTitle, setNewNoteTitle] = useState("")
  const [isCreatingNote, setIsCreatingNote] = useState(false)
  const [savingNote, setSavingNote] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  // Auto-focus textarea when verse is appended
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // When notebooks load and there is no active notebook, select the first one if available
  useEffect(() => {
    if (notebooks.length > 0 && activeNotebookId === null) {
      setActiveNotebookId(notebooks[0].id)
    }
  }, [notebooks, activeNotebookId])

  async function handleCreateNotebook() {
    if (!newNotebookName.trim()) return
    try {
      const res = await fetch("/api/notebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newNotebookName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await mutateNotebooks()
      setActiveNotebookId(data.id)
      setNewNotebookName("")
      setIsCreatingNotebook(false)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al crear libreta")
    }
  }

  async function handleDeleteNotebook() {
    if (!activeNotebookId) return
    const currentNotebook = notebooks.find((n) => n.id === activeNotebookId)
    if (!confirm(`¿Estás seguro de eliminar la libreta "${currentNotebook?.name}" y todas sus notas?`)) {
      return
    }
    try {
      const res = await fetch(`/api/notebooks/${activeNotebookId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      setActiveNotebookId(null)
      setEditingNote(null)
      await mutateNotebooks()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al eliminar libreta")
    }
  }

  async function handleCreateNote() {
    if (!activeNotebookId || !newNoteTitle.trim()) return
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("joplin_token") : null
      const res = await fetch(`/api/notebooks/${activeNotebookId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-joplin-token": token } : {}),
        },
        body: JSON.stringify({ title: newNoteTitle.trim(), content: "" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await mutateNotes()
      setEditingNote({ id: data.id, title: data.title, content: data.content })
      setNewNoteTitle("")
      setIsCreatingNote(false)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al crear nota")
    }
  }

  async function handleSaveNote() {
    if (!editingNote) return
    setSavingNote(true)
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("joplin_token") : null
      const res = await fetch(`/api/notebooks/notes/${editingNote.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-joplin-token": token } : {}),
        },
        body: JSON.stringify({ title: editingNote.title, content: editingNote.content }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      await mutateNotes()
      setSavedAt(new Date().toLocaleTimeString())
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al guardar nota")
    } finally {
      setSavingNote(false)
    }
  }

  async function handleDeleteNote(noteId: number, title: string, event: React.MouseEvent) {
    event.stopPropagation() // Don't trigger editing note click
    if (!confirm(`¿Eliminar la nota "${title}"?`)) return
    try {
      const res = await fetch(`/api/notebooks/notes/${noteId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      if (editingNote?.id === noteId) {
        setEditingNote(null)
      }
      await mutateNotes()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al eliminar nota")
    }
  }

  const selectedNotebook = notebooks.find((n) => n.id === activeNotebookId)

  // Notebook Note Editor view
  if (editingNote) {
    return (
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingNote(null)
              setSavedAt(null)
            }}
            className="h-8 gap-1.5 px-2"
          >
            <ArrowLeft className="size-4" />
            <span>Volver</span>
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {savedAt ? `Guardado ${savedAt}` : "Cambios sin guardar"}
            </span>
            <Button
              onClick={handleSaveNote}
              disabled={savingNote}
              size="sm"
              className="h-8 gap-1.5"
            >
              {savingNote ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              <span>Guardar</span>
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-3 p-4 overflow-hidden">
          <Input
            value={editingNote.title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingNote({ ...editingNote, title: e.target.value })}
            placeholder="Título de la nota"
            className="border-none bg-transparent px-0 text-lg font-bold focus-visible:ring-0"
          />

          <div className="relative flex-1">
            <Textarea
              ref={textareaRef}
              value={editingNote.content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditingNote({ ...editingNote, content: e.target.value })}
              placeholder="Comienza a escribir. Haz clic en el botón '+' de los versículos de la Biblia para insertarlos aquí..."
              className="h-full w-full resize-none border-none bg-transparent px-0 py-1 font-sans text-base leading-relaxed focus-visible:ring-0"
            />
          </div>

          <div className="rounded-md bg-accent/30 px-3 py-2.5 text-xs text-muted-foreground flex items-center gap-2">
            <BookOpen className="size-3.5 text-primary shrink-0" />
            <p>
              <strong>Tip:</strong> Puedes insertar versículos directamente haciendo clic en el icono 
              <span className="mx-1 font-bold inline-flex items-center justify-center size-4 bg-primary/10 text-primary rounded text-[10px]">+</span>
              del lector de la Biblia a la izquierda.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Notebook & Note List view
  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-col gap-3 border-b border-border p-4">
        {/* Notebook Selector & Creation */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Mi Cuaderno
          </label>
          <div className="flex items-center gap-2">
            {isCreatingNotebook ? (
              <div className="flex w-full items-center gap-2">
                <Input
                  value={newNotebookName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewNotebookName(e.target.value)}
                  placeholder="Nombre de libreta"
                  className="h-9"
                  autoFocus
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter") handleCreateNotebook()
                    if (e.key === "Escape") setIsCreatingNotebook(false)
                  }}
                />
                <Button size="sm" onClick={handleCreateNotebook}>
                  Crear
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsCreatingNotebook(false)}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <>
                <Select
                  value={activeNotebookId ? String(activeNotebookId) : ""}
                  onValueChange={(val) => val && setActiveNotebookId(Number(val))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Elige un cuaderno" />
                  </SelectTrigger>
                  <SelectContent>
                    {notebooks.map((n) => (
                      <SelectItem key={n.id} value={String(n.id)}>
                        {n.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsCreatingNotebook(true)}
                  title="Nueva Libreta"
                >
                  <FolderPlus className="size-4" />
                </Button>
                {activeNotebookId && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleDeleteNotebook}
                    className="text-destructive hover:bg-destructive/10"
                    title="Eliminar Libreta"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Note list for active notebook */}
      <div className="flex-1 overflow-auto p-4">
        {!activeNotebookId ? (
          <div className="flex h-48 flex-col items-center justify-center text-center text-muted-foreground">
            <BookOpen className="mb-2 size-8 text-muted-foreground/50" />
            <p className="text-sm">Crea o selecciona una libreta para ver tus notas.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">
                Notas en {selectedNotebook?.name}
              </h3>
              {isCreatingNote ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newNoteTitle}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewNoteTitle(e.target.value)}
                    placeholder="Título de la nota"
                    className="h-8 text-xs w-36"
                    autoFocus
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter") handleCreateNote()
                      if (e.key === "Escape") setIsCreatingNote(false)
                    }}
                  />
                  <Button size="sm" className="h-8 px-2 text-xs" onClick={handleCreateNote}>
                    +
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreatingNote(true)}
                  className="h-8 gap-1 text-xs"
                >
                  <Plus className="size-3.5" />
                  <span>Nueva Nota</span>
                </Button>
              )}
            </div>

            {notesLoading ? (
              <p className="text-xs text-muted-foreground">Cargando notas...</p>
            ) : notes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-muted-foreground">
                <FileText className="mx-auto mb-2 size-6 opacity-40" />
                <p className="text-xs">No hay notas en esta libreta.</p>
                <Button
                  variant="link"
                  onClick={() => setIsCreatingNote(true)}
                  className="mt-1 h-auto text-xs p-0"
                >
                  Crea tu primera nota
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {notes.map((note) => (
                  <li
                    key={note.id}
                    onClick={() =>
                      setEditingNote({
                        id: note.id,
                        title: note.title,
                        content: note.content,
                      })
                    }
                    className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-card/50 p-3 hover:bg-accent/40 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {note.title || "Sin título"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {note.content
                          ? note.content.substring(0, 60).replace(/[#>*\n]/g, "") +
                            (note.content.length > 60 ? "..." : "")
                          : "Nota vacía"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleDeleteNote(note.id, note.title, e)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
