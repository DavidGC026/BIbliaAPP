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
  onSessionExpired: () => void
}

export function NotebookSidebar({ editingNote, setEditingNote, onSessionExpired }: NotebookSidebarProps) {
  const [session, setSession] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSession(localStorage.getItem("biblia_token"))
    }
  }, [])

  const { data: notebooksData, mutate: mutateNotebooks, error: notebooksError } = useSWR<{ notebooks: Notebook[] }>(
    session ? "/api/notebooks" : null,
    fetcher
  )
  const notebooks = notebooksData?.notebooks ?? []

  const [activeNotebookId, setActiveNotebookId] = useState<number | null>(null)
  const [newNotebookName, setNewNotebookName] = useState("")
  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false)
  const [creatingNotebook, setCreatingNotebook] = useState(false)
  const [deletingNotebook, setDeletingNotebook] = useState(false)

  const notesKey = activeNotebookId ? `/api/notebooks/${activeNotebookId}/notes` : null
  const { data: notesData, mutate: mutateNotes, isLoading: notesLoading, error: notesError } = useSWR<{ notes: NotebookNote[] }>(
    notesKey,
    fetcher
  )
  const notes = notesData?.notes ?? []

  useEffect(() => {
    if (notebooksError && (notebooksError.status === 401 || notebooksError.status === 403)) {
      localStorage.removeItem("biblia_token")
      onSessionExpired()
    }
  }, [notebooksError, onSessionExpired])

  useEffect(() => {
    if (notesError && (notesError.status === 401 || notesError.status === 403)) {
      localStorage.removeItem("biblia_token")
      onSessionExpired()
    }
  }, [notesError, onSessionExpired])

  // Si la libreta activa ya no existe (p. ej. tras eliminarla), limpiar estado
  useEffect(() => {
    if (notesError?.status === 404 && activeNotebookId) {
      setActiveNotebookId(null)
      setEditingNote(null)
      void mutateNotebooks()
    }
  }, [notesError, activeNotebookId, mutateNotebooks, setEditingNote])

  const [newNoteTitle, setNewNoteTitle] = useState("")
  const [isCreatingNote, setIsCreatingNote] = useState(false)
  const [savingNote, setSavingNote] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  // Fetch the full note content when a note is selected
  const { data: noteDetails, isLoading: noteDetailsLoading } = useSWR<{ note: NotebookNote }>(
    editingNote ? `/api/notebooks/notes/${editingNote.id}` : null,
    fetcher
  )

  useEffect(() => {
    if (noteDetails?.note && editingNote && noteDetails.note.id === editingNote.id) {
      if (noteDetails.note.content !== editingNote.content && !savingNote) {
        setEditingNote({
          id: editingNote.id,
          title: noteDetails.note.title,
          content: noteDetails.note.content || "",
        })
      }
    }
  }, [noteDetails, editingNote?.id])

  // Auto-focus textarea when verse is appended
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Mantener libreta activa sincronizada con la lista real
  useEffect(() => {
    if (!notebooksData) return

    if (notebooks.length === 0) {
      if (activeNotebookId !== null) setActiveNotebookId(null)
      return
    }

    if (activeNotebookId === null || !notebooks.some((n) => n.id === activeNotebookId)) {
      setActiveNotebookId(notebooks[0].id)
    }
  }, [notebooks, activeNotebookId, notebooksData])

  async function handleCreateNotebook() {
    if (!newNotebookName.trim() || creatingNotebook) return
    setCreatingNotebook(true)
    const token = localStorage.getItem("biblia_token")
    try {
      const res = await fetch("/api/notebooks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: newNotebookName.trim() }),
      })
      const data = await res.json()
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("biblia_token")
        onSessionExpired()
        return
      }
      if (!res.ok) throw new Error(data.error)
      await mutateNotebooks()
      setActiveNotebookId(data.id)
      setNewNotebookName("")
      setIsCreatingNotebook(false)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al crear libreta")
    } finally {
      setCreatingNotebook(false)
    }
  }

  async function handleDeleteNotebook() {
    if (!activeNotebookId || deletingNotebook) return
    const currentNotebook = notebooks.find((n) => n.id === activeNotebookId)
    if (!confirm(`¿Estás seguro de eliminar la libreta "${currentNotebook?.name}" y todas sus notas?`)) {
      return
    }

    const deletedId = activeNotebookId
    setActiveNotebookId(null)
    setEditingNote(null)
    setIsCreatingNote(false)
    setIsCreatingNotebook(false)
    void mutateNotes(undefined, { revalidate: false })

    setDeletingNotebook(true)
    const token = localStorage.getItem("biblia_token")
    try {
      const res = await fetch(`/api/notebooks/${deletedId}`, {
        method: "DELETE",
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      const updated = await mutateNotebooks()
      const remaining = updated?.notebooks ?? []
      if (remaining.length === 0) {
        setActiveNotebookId(null)
        setIsCreatingNotebook(true)
      } else {
        setActiveNotebookId(remaining[0].id)
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al eliminar libreta")
      await mutateNotebooks()
    } finally {
      setDeletingNotebook(false)
    }
  }

  async function handleCreateNote() {
    if (!hasValidNotebook || !activeNotebookId || !newNoteTitle.trim()) return
    const token = localStorage.getItem("biblia_token")
    try {
      const res = await fetch(`/api/notebooks/${activeNotebookId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ title: newNoteTitle.trim(), content: "" }),
      })
      const data = await res.json()
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("biblia_token")
        onSessionExpired()
      }
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
    const token = localStorage.getItem("biblia_token")
    try {
      const res = await fetch(`/api/notebooks/notes/${editingNote.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ title: editingNote.title, content: editingNote.content }),
      })
      if (!res.ok) {
        const data = await res.json()
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("biblia_token")
          onSessionExpired()
        }
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

  async function handleDeleteNote(noteId: number, title: string, event?: React.MouseEvent) {
    event?.stopPropagation()
    if (!confirm(`¿Eliminar la nota "${title}"?`)) return
    const token = localStorage.getItem("biblia_token")
    try {
      const res = await fetch(`/api/notebooks/notes/${noteId}`, {
        method: "DELETE",
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        }
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
  const hasValidNotebook = activeNotebookId !== null && notebooks.some((n) => n.id === activeNotebookId)

  // Note Editor view
  if (editingNote) {
    return (
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 bg-card/40">
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteNote(editingNote.id, editingNote.title)}
              className="size-8 text-destructive hover:bg-destructive/10"
              title="Eliminar nota"
            >
              <Trash2 className="size-4" />
            </Button>
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
            {noteDetailsLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" />
                Cargando nota...
              </div>
            ) : (
              <Textarea
                ref={textareaRef}
                value={editingNote.content}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditingNote({ ...editingNote, content: e.target.value })}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = "copy"
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  const dragText = e.dataTransfer.getData("text/plain")
                  if (dragText) {
                    const formattedText = `\n> **${dragText}**\n\n`
                    const start = textareaRef.current?.selectionStart ?? editingNote.content.length
                    const end = textareaRef.current?.selectionEnd ?? editingNote.content.length
                    const textBefore = editingNote.content.substring(0, start)
                    const textAfter = editingNote.content.substring(end)
                    setEditingNote({
                      ...editingNote,
                      content: textBefore + formattedText + textAfter
                    })
                  }
                }}
                placeholder="Comienza a escribir. Haz clic en el botón '+' o arrastra los versículos de la Biblia aquí para insertarlos..."
                className="h-full w-full resize-none border-none bg-transparent px-0 py-1 font-sans text-base leading-relaxed focus-visible:ring-0"
              />
            )}
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
      <header className="flex flex-col gap-3 border-b border-border p-4 bg-card/20">
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
                <Button size="sm" onClick={handleCreateNotebook} disabled={creatingNotebook}>
                  {creatingNotebook ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Crear"
                  )}
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
                  value={hasValidNotebook ? String(activeNotebookId) : ""}
                  onValueChange={(val) => val && setActiveNotebookId(Number(val))}
                  disabled={deletingNotebook || notebooks.length === 0}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={deletingNotebook ? "Eliminando..." : "Elige un cuaderno"} />
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
                {hasValidNotebook && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleDeleteNotebook}
                    disabled={deletingNotebook}
                    className="text-destructive hover:bg-destructive/10"
                    title="Eliminar Libreta"
                  >
                    {deletingNotebook ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Note list for active notebook */}
      <div className="flex-1 overflow-auto p-4">
        {deletingNotebook ? (
          <div className="flex h-48 flex-col items-center justify-center text-center text-muted-foreground">
            <Loader2 className="mb-2 size-8 animate-spin text-primary" />
            <p className="text-sm">Eliminando libreta...</p>
          </div>
        ) : !hasValidNotebook ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <BookOpen className="size-8 text-muted-foreground/50" />
            <p className="text-sm">No tienes libretas. Crea una nueva para empezar.</p>
            {!isCreatingNotebook && (
              <Button size="sm" onClick={() => setIsCreatingNotebook(true)} className="gap-1.5">
                <FolderPlus className="size-4" />
                Nueva libreta
              </Button>
            )}
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
                      className="size-7 shrink-0 text-muted-foreground hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleDeleteNote(note.id, note.title, e)}
                      aria-label={`Eliminar nota ${note.title}`}
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
