import { useState, useEffect, useRef, type Dispatch, type SetStateAction } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  countNoteWords,
  estimateNoteReadMinutes,
  isNotePinned,
  noteHtmlToPlainText,
  stripNotePreview,
  NOTE_TAGS,
  parseNoteTags,
  togglePinnedNoteTag,
} from "@/lib/notebook-covers"
import { NoteContent, NoteRichEditor, requestEditorHtml } from "@/components/note-rich-editor"
import { defaultNoteTitle, insertHtmlIntoNoteContent } from "@/lib/note-content"
import { 
  ChevronRight, 
  Plus, 
  Search, 
  Trash2,
  X,
  ArrowLeft,
  Loader2,
  Save,
  BookOpen,
  FolderPlus,
  Book,
  Edit2,
  Sparkles,
  FileText,
  Calendar,
  Upload,
  Pin,
  PinOff,
  FolderInput,
  Share2,
  Link2,
  Languages,
} from "lucide-react"

const AVAILABLE_TAGS = NOTE_TAGS

const PRESET_COVERS = [
  { id: "grad-purple", label: "Púrpura Imperial", class: "bg-gradient-to-br from-indigo-950 via-purple-900 to-rose-800" },
  { id: "grad-blue", label: "Cielo Nocturno", class: "bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900" },
  { id: "grad-ocean", label: "Océano Profundo", class: "bg-gradient-to-br from-blue-950 via-cyan-900 to-teal-800" },
  { id: "grad-emerald", label: "Bosque Místico", class: "bg-gradient-to-br from-emerald-950 via-teal-950 to-emerald-900" },
  { id: "grad-gold", label: "Escritura Antigua", class: "bg-gradient-to-br from-stone-900 via-amber-950 to-amber-900" },
  { id: "grad-rose", label: "Gracia Divina", class: "bg-gradient-to-br from-stone-950 via-rose-950 to-pink-900" }
]

interface BibleVersion {
  bibleId: number
  abbr: string
  name: string
}

interface CrossReference {
  book_name: string
  book_id: number
  chapter: number
  verse: number
  text: string
  votos?: number
}

interface StrongEntry {
  strongCode: string
  lemma: string
  transliteration: string
  definition: string
}

interface DictionaryResponse {
  entries: StrongEntry[]
  totalPages: number
}

type DictionaryLang = "all" | "greek" | "hebrew"

const DICTIONARY_LANG_OPTIONS: { id: DictionaryLang; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "greek", label: "Griego" },
  { id: "hebrew", label: "Hebreo" },
]

const DICTIONARY_EXAMPLES = ["G25", "H430", "agapao", "shalom", "logos"]

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function parseDictionaryDefinition(definition: string): { label: string; text: string }[] {
  if (!definition) return []
  const labelMap: Record<string, string> = {
    Strong: "Definición",
    KJV: "Traducciones (KJV)",
    Derivation: "Derivación",
  }
  return definition.split(/\n\n+/).flatMap((block) => {
    const match = block.match(/^(Strong|KJV|Derivation):\s*([\s\S]*)$/)
    if (match) return [{ label: labelMap[match[1]] ?? match[1], text: match[2].trim() }]
    return block.trim() ? [{ label: "", text: block.trim() }] : []
  })
}

function formatDictionaryInsertion(entry: StrongEntry): string {
  const sections = parseDictionaryDefinition(entry.definition)
  const defHtml = sections.length
    ? sections.map((section) => {
        const label = section.label
          ? `<div class="biblia-dict-section-label">${escapeHtml(section.label)}</div>`
          : ""
        return `${label}<div class="biblia-dict-section-text">${escapeHtml(section.text)}</div>`
      }).join("")
    : `<div class="biblia-dict-section-text">${escapeHtml(entry.definition)}</div>`
  const langLabel = entry.strongCode.startsWith("H") ? "Hebreo" : "Griego"
  return (
    `<aside class="biblia-dict-entry" data-strong="${escapeHtml(entry.strongCode)}" contenteditable="false">` +
    `<div class="biblia-dict-label">📚 Diccionario Strong · ${langLabel}</div>` +
    `<div class="biblia-dict-head">` +
    `<span class="biblia-dict-code">${escapeHtml(entry.strongCode)}</span>` +
    `<span class="biblia-dict-lemma">${escapeHtml(entry.lemma)}</span>` +
    (entry.transliteration ? `<span class="biblia-dict-trans">${escapeHtml(entry.transliteration)}</span>` : "") +
    `</div><div class="biblia-dict-body">${defHtml}</div></aside><p><br></p>`
  )
}

function formatReferenceInsertion(source: string, references: CrossReference[], bibleAbbr: string): string {
  if (!references.length) return ""
  const body = references
    .map((ref) => `<strong>${escapeHtml(ref.book_name)} ${ref.chapter}:${ref.verse}</strong> ${escapeHtml(ref.text)}`)
    .join("<br/>")
  return `<blockquote><strong>Referencias relacionadas con ${escapeHtml(source)} (${escapeHtml(bibleAbbr)})</strong><br/>${body}</blockquote><p><br></p>`
}

interface Notebook {
  id: number
  name: string
  coverImage?: string | null
  createdAt: string
}

interface NotebookNote {
  id: number
  notebookId: number
  title: string
  content: string
  createdAt: string
  updatedAt: string
  tags?: string
}

interface NotebookSidebarProps {
  editingNote: { id: number; title: string; content: string; tags?: string } | null
  setEditingNote: React.Dispatch<
    React.SetStateAction<{ id: number; title: string; content: string; tags?: string } | null>
  >
  onSessionExpired: () => void
  embedded?: boolean
}

export function NotebookSidebar({ editingNote, setEditingNote, onSessionExpired, embedded = false }: NotebookSidebarProps) {
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
  
  // Modales y Edición de Libretas
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [modalMode, setModalMode] = useState<"create" | "edit">("create")
  const [configName, setConfigName] = useState("")
  const [configCover, setConfigCover] = useState("grad-purple")
  const [customCoverUrl, setCustomCoverUrl] = useState("")
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const [savingNotebook, setSavingNotebook] = useState(false)
  const [deletingNotebook, setDeletingNotebook] = useState(false)

  // Modal de inserción interactiva de versículos
  const [showInsertVerseModal, setShowInsertVerseModal] = useState(false)
  const [insertBibleId, setInsertBibleId] = useState<number>(149)
  const [insertBookId, setInsertBookId] = useState<number | null>(null)
  const [insertChapter, setInsertChapter] = useState<number>(1)
  const [selectedVerses, setSelectedVerses] = useState<{ verse: number; text: string }[]>([])

  const [showInsertReferenceModal, setShowInsertReferenceModal] = useState(false)
  const [insertReferenceVerse, setInsertReferenceVerse] = useState<number>(1)
  const [selectedReferences, setSelectedReferences] = useState<CrossReference[]>([])

  const [showInsertDictionaryModal, setShowInsertDictionaryModal] = useState(false)
  const [dictionaryQuery, setDictionaryQuery] = useState("")
  const [debouncedDictionaryQuery, setDebouncedDictionaryQuery] = useState("")
  const [dictionaryLang, setDictionaryLang] = useState<DictionaryLang>("all")
  const [dictionaryPage, setDictionaryPage] = useState(1)
  const [dictionaryBrowse, setDictionaryBrowse] = useState(false)
  const [selectedDictionaryEntry, setSelectedDictionaryEntry] = useState<StrongEntry | null>(null)

  // Filtros de búsqueda
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"recent" | "title" | "long">("recent")
  const [moveTarget, setMoveTarget] = useState<NotebookNote | null>(null)

  const notesKey = activeNotebookId ? `/api/notebooks/${activeNotebookId}/notes` : null
  const { data: notesData, mutate: mutateNotes, isLoading: notesLoading, error: notesError } = useSWR<{ notes: NotebookNote[] }>(
    notesKey,
    fetcher
  )
  const notes = notesData?.notes ?? []

  // SWR queries for inserting verses
  const { data: insertBiblesData } = useSWR<{ bibles: BibleVersion[] }>(
    showInsertVerseModal || showInsertReferenceModal ? "/api/bibles" : null,
    fetcher
  )
  const insertBibles = insertBiblesData?.bibles ?? []

  const { data: insertBooksData } = useSWR<{ books: { bookId: number; bookName: string; chapters: number }[] }>(
    (showInsertVerseModal || showInsertReferenceModal) && insertBibleId ? `/api/books?bible=${insertBibleId}` : null,
    fetcher
  )
  const insertBooks = insertBooksData?.books ?? []

  const { data: insertVersesData } = useSWR<{ verses: { id: number; verse: number; text: string }[] }>(
    showInsertVerseModal && insertBibleId && insertBookId && insertChapter 
      ? `/api/verses?bible=${insertBibleId}&book=${insertBookId}&chapter=${insertChapter}` 
      : null,
    fetcher
  )
  const insertVerses = insertVersesData?.verses ?? []

  const { data: insertReferencesData, isLoading: referencesLoading } = useSWR<{ references: CrossReference[] }>(
    showInsertReferenceModal && insertBibleId && insertBookId && insertChapter && insertReferenceVerse
      ? `/api/references?bible=${insertBibleId}&bookId=${insertBookId}&chapter=${insertChapter}&verse=${insertReferenceVerse}`
      : null,
    fetcher,
  )
  const insertReferences = insertReferencesData?.references ?? []

  const dictionaryHasValidQuery = debouncedDictionaryQuery.length >= 2 || /^[gh]\d+$/i.test(debouncedDictionaryQuery)
  const dictionaryShouldFetch = showInsertDictionaryModal && (dictionaryHasValidQuery || dictionaryBrowse)
  const dictionaryUrl = dictionaryShouldFetch
    ? `/api/dictionary?dict=strong&q=${encodeURIComponent(debouncedDictionaryQuery)}&lang=${dictionaryLang}&page=${dictionaryPage}${dictionaryBrowse && !dictionaryHasValidQuery ? "&browse" : ""}`
    : null
  const { data: dictionaryData, isLoading: dictionaryLoading } = useSWR<DictionaryResponse>(dictionaryUrl, fetcher, {
    keepPreviousData: true,
  })
  const dictionaryEntries = dictionaryData?.entries ?? []

  // Auto-select first book when books load
  useEffect(() => {
    if (insertBooks.length > 0 && !insertBookId) {
      setInsertBookId(insertBooks[0].bookId)
    }
  }, [insertBooks, insertBookId])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedDictionaryQuery(dictionaryQuery.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [dictionaryQuery])

  useEffect(() => {
    setDictionaryPage(1)
    setSelectedDictionaryEntry(null)
  }, [debouncedDictionaryQuery, dictionaryLang, dictionaryBrowse])

  const handleInsertBibleChange = (bibleId: number) => {
    setInsertBibleId(bibleId)
    setInsertBookId(null)
    setInsertChapter(1)
    setInsertReferenceVerse(1)
    setSelectedVerses([])
    setSelectedReferences([])
  }

  const handleInsertBookChange = (bookId: number) => {
    setInsertBookId(bookId)
    setInsertChapter(1)
    setInsertReferenceVerse(1)
    setSelectedVerses([])
    setSelectedReferences([])
  }

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
  const [previewMode, setPreviewMode] = useState(false)
  const [contentDirty, setContentDirty] = useState(false)
  const [editorEpoch, setEditorEpoch] = useState(0)

  // Fetch the full note content when a note is selected
  const { data: noteDetails, isLoading: noteDetailsLoading } = useSWR<{ note: NotebookNote }>(
    editingNote ? `/api/notebooks/notes/${editingNote.id}` : null,
    fetcher
  )

  useEffect(() => {
    if (noteDetails?.note && editingNote && noteDetails.note.id === editingNote.id) {
      if (!contentDirty && noteDetails.note.content !== editingNote.content && !savingNote) {
        setEditingNote({
          id: editingNote.id,
          title: noteDetails.note.title,
          content: noteDetails.note.content || "",
          tags: noteDetails.note.tags || "[]",
        })
      }
    }
  }, [noteDetails, editingNote?.id, contentDirty, savingNote])

  const editorFrameRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    setContentDirty(false)
    setEditorEpoch(0)
  }, [editingNote?.id])

  // Autoguardado: tras 4s sin teclear se persiste en silencio, como en la app
  // móvil, así la nota sobrevive aunque se cierre la pestaña sin pulsar Guardar.
  useEffect(() => {
    if (!editingNote || !contentDirty || savingNote || previewMode) return
    const timer = setTimeout(async () => {
      const html = await requestEditorHtml(editorFrameRef.current)
      void handleSaveNote(html || editingNote.content, { silent: true })
    }, 4000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingNote, contentDirty, savingNote, previewMode])

  // Manejar creación/edición de libreta
  async function handleSaveNotebook() {
    if (!configName.trim() || savingNotebook) return
    setSavingNotebook(true)
    const token = localStorage.getItem("biblia_token")
    const coverToSave = customCoverUrl.trim() || configCover

    try {
      if (modalMode === "create") {
        const res = await fetch("/api/notebooks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ name: configName.trim(), coverImage: coverToSave }),
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
      } else {
        if (!activeNotebookId) return
        const res = await fetch(`/api/notebooks/${activeNotebookId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ name: configName.trim(), coverImage: coverToSave }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        await mutateNotebooks()
      }
      setShowConfigModal(false)
      setConfigName("")
      setCustomCoverUrl("")
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al procesar libreta")
    } finally {
      setSavingNotebook(false)
    }
  }

  async function handleDeleteNotebook(notebookId: number, name: string, event?: React.MouseEvent) {
    event?.stopPropagation()
    if (!confirm(`¿Estás seguro de eliminar la libreta "${name}" y todas sus notas?`)) {
      return
    }

    setDeletingNotebook(true)
    const token = localStorage.getItem("biblia_token")
    try {
      const res = await fetch(`/api/notebooks/${notebookId}`, {
        method: "DELETE",
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      if (activeNotebookId === notebookId) {
        setActiveNotebookId(null)
        setEditingNote(null)
      }
      await mutateNotebooks()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al eliminar libreta")
    } finally {
      setDeletingNotebook(false)
    }
  }

  async function handleCreateNote() {
    if (!activeNotebookId || !newNoteTitle.trim()) return
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

  async function handleSaveNote(contentOverride?: string, opts: { silent?: boolean } = {}) {
    if (!editingNote) return
    const contentToSave = contentOverride ?? editingNote.content
    const titleToSave = defaultNoteTitle(editingNote.title)
    setSavingNote(true)
    const token = localStorage.getItem("biblia_token")
    try {
      const res = await fetch(`/api/notebooks/notes/${editingNote.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ title: titleToSave, content: contentToSave, tags: editingNote.tags }),
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
      setEditingNote({ ...editingNote, title: titleToSave, content: contentToSave })
      setContentDirty(false)
      setSavedAt(new Date().toLocaleTimeString())
    } catch (e) {
      // Autoguardado: fallar en silencio, se reintenta en el próximo ciclo
      if (!opts.silent) alert(e instanceof Error ? e.message : "Error al guardar nota")
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

  async function updateNoteMeta(note: NotebookNote, tags?: string[], notebookId?: number) {
    const token = localStorage.getItem("biblia_token")
    const res = await fetch(`/api/notebooks/notes/${note.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        title: defaultNoteTitle(note.title),
        content: note.content,
        tags: tags ?? parseNoteTags(note.tags),
        notebookId,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || "No se pudo actualizar la nota")
    }
  }

  async function handleTogglePin(note: NotebookNote, event: React.MouseEvent) {
    event.stopPropagation()
    try {
      await updateNoteMeta(note, togglePinnedNoteTag(note.tags))
      await mutateNotes()
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo fijar la nota")
    }
  }

  async function handleMoveNote(targetNotebookId: number) {
    if (!moveTarget) return
    try {
      await updateNoteMeta(moveTarget, parseNoteTags(moveTarget.tags), targetNotebookId)
      setMoveTarget(null)
      await mutateNotes()
      await mutateNotebooks()
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo mover la nota")
    }
  }

  function handleShareNote(note: NotebookNote, event: React.MouseEvent) {
    event.stopPropagation()
    const body = noteHtmlToPlainText(note.content)
    if (navigator.share) {
      void navigator.share({ title: note.title, text: body }).catch(() => undefined)
      return
    }
    void navigator.clipboard?.writeText(`${note.title}\n\n${body}`)
    alert("Nota copiada al portapapeles")
  }

  function handleExportPdf(note: NotebookNote, event: React.MouseEvent) {
    event.stopPropagation()
    const win = window.open("", "_blank", "width=820,height=900")
    if (!win) return
    win.document.write(`<!doctype html><html><head><title>${note.title}</title><style>body{font-family:system-ui,sans-serif;line-height:1.6;padding:32px;color:#1f2937}img{max-width:100%;height:auto;border-radius:8px}blockquote{border-left:4px solid #92700C;padding-left:16px;color:#57534e}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px}</style></head><body><h1>${note.title || "Sin título"}</h1>${note.content || "<p>Sin contenido</p>"}</body></html>`)
    win.document.close()
    win.focus()
    win.print()
  }

  // Componente de Portada de Libro
  function BookCover({ title, coverImage, className = "", onClick }: { title: string, coverImage?: string | null, className?: string, onClick?: () => void }) {
    const preset = PRESET_COVERS.find(c => c.id === coverImage)
    
    const style = preset && 'url' in preset
      ? { backgroundImage: `url(${preset.url})` } 
      : coverImage && coverImage.startsWith("http") 
        ? { backgroundImage: `url(${coverImage})` } 
        : {}

    const bgClass = preset ? preset.class : (coverImage && !coverImage.startsWith("http") ? coverImage : "bg-gradient-to-br from-primary/80 to-primary-foreground/90")

    return (
      <div 
        onClick={onClick}
        className={cn(
          "relative w-32 h-44 rounded-r-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 active:scale-95 group cursor-pointer flex flex-col justify-between p-3.5 text-white border-l-[6px] border-black/30",
          bgClass,
          className
        )}
        style={{
          backgroundSize: "cover",
          backgroundPosition: "center",
          ...style
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-black/15 pointer-events-none" />
        <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-white/25 pointer-events-none" />
        
        <div className="mt-1 text-[11px] font-extrabold leading-snug line-clamp-4 drop-shadow-md uppercase tracking-wider font-serif">
          {title}
        </div>

        <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/20">
          <Book className="size-3.5 opacity-80" />
          <span className="text-[8px] font-bold tracking-widest uppercase opacity-75">
            ESTUDIO
          </span>
        </div>
      </div>
    )
  }

  const selectedNotebook = notebooks.find((n) => n.id === activeNotebookId)
  const selectedBookObj = insertBooks.find(b => b.bookId === insertBookId)
  const selectedBibleObj = insertBibles.find(b => b.bibleId === insertBibleId)
  const selectedReferenceExists = (ref: CrossReference) =>
    selectedReferences.some((item) => item.book_id === ref.book_id && item.chapter === ref.chapter && item.verse === ref.verse)

  const insertBlockIntoEditingNote = (htmlBlock: string) => {
    if (!htmlBlock) return
    setEditingNote((prev) =>
      prev
        ? { ...prev, content: insertHtmlIntoNoteContent(prev.content, htmlBlock) }
        : prev,
    )
    setContentDirty(true)
    setEditorEpoch((e) => e + 1)
  }

  const filteredNotes = notes
    .filter(n => {
      const q = searchQuery.trim().toLowerCase()
      if (!q) return true
      return n.title.toLowerCase().includes(q) || noteHtmlToPlainText(n.content).toLowerCase().includes(q)
    })
    .sort((a, b) => {
      const pinnedDelta = Number(isNotePinned(b.tags)) - Number(isNotePinned(a.tags))
      if (pinnedDelta !== 0) return pinnedDelta
      if (sortBy === "title") return a.title.localeCompare(b.title, "es")
      if (sortBy === "long") return countNoteWords(b.content) - countNoteWords(a.content)
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  const totalWords = notes.reduce((sum, note) => sum + countNoteWords(note.content), 0)

  // Note Editor view (mobile-style)
  if (editingNote) {
    return (
      <div className="flex h-full flex-col bg-background">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border/80 px-4 py-3 bg-card/80 backdrop-blur-md shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingNote(null)
              setSavedAt(null)
              setPreviewMode(false)
              setContentDirty(false)
              setEditorEpoch(0)
            }}
            className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            <span>Volver</span>
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {savingNote ? "Guardando…" : contentDirty ? "Sin guardar" : savedAt ? `Guardado ${savedAt}` : ""}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteNote(editingNote.id, editingNote.title)}
              className="h-8 px-2 text-destructive hover:bg-destructive/10"
            >
              Borrar
            </Button>
            <Button
              onClick={async () => {
                const html = await requestEditorHtml(editorFrameRef.current)
                await handleSaveNote(html || editingNote.content)
              }}
              disabled={savingNote}
              size="sm"
              className="h-8 gap-1.5 bg-primary/90 hover:bg-primary shadow-sm"
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

        <div className="px-4 pt-2 shrink-0">
          <Input
            value={editingNote.title}
            onChange={(e) => {
              setContentDirty(true)
              setEditingNote((prev) => (prev ? { ...prev, title: e.target.value } : prev))
            }}
            placeholder="Título de la nota"
            className="border-0 border-b border-border rounded-none bg-transparent px-0 text-2xl font-extrabold focus-visible:ring-0 placeholder:text-muted-foreground/40"
          />
        </div>

        <div className="px-4 py-1.5 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card px-3 py-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
              <span className={cn("size-2 rounded-full", contentDirty ? "bg-amber-500" : "bg-primary")} />
              <span>{savingNote ? "Guardando..." : contentDirty ? "Sin guardar" : savedAt ? `Guardado ${savedAt}` : "Listo"}</span>
              <span>·</span>
              <span>{countNoteWords(editingNote.content)} palabras</span>
              <span>·</span>
              <span>{estimateNoteReadMinutes(editingNote.content)} min</span>
            </div>
            <button
              type="button"
              onClick={() => setPreviewMode((p) => !p)}
              className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-extrabold text-primary transition-colors hover:bg-primary/15"
            >
              {previewMode ? "Editar" : "Vista previa"}
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 relative">
          {noteDetailsLoading ? (
            <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin text-primary" />
              Cargando nota...
            </div>
          ) : previewMode ? (
            <div className="h-full overflow-y-auto px-4 pb-6">
              <div className="rounded-xl border border-border bg-card p-4 min-h-[280px]">
                <NoteContent content={editingNote.content || "Sin contenido"} />
              </div>
            </div>
          ) : (
            <NoteRichEditor
              key={`${editingNote.id}-${noteDetailsLoading ? "loading" : "ready"}`}
              contentVersion={`${editingNote.id}-${noteDetails?.note?.updatedAt ?? "new"}-${editorEpoch}`}
              ref={editorFrameRef}
              content={editingNote.content}
              onChange={(html) => {
                setContentDirty(true)
                setEditingNote((prev) => (prev ? { ...prev, content: html } : prev))
              }}
              onInsertVerse={() => {
                if (insertBooks.length > 0 && !insertBookId) {
                  setInsertBookId(insertBooks[0].bookId)
                }
                setShowInsertVerseModal(true)
              }}
              onInsertReferences={() => {
                if (insertBooks.length > 0 && !insertBookId) {
                  setInsertBookId(insertBooks[0].bookId)
                }
                setSelectedReferences([])
                setShowInsertReferenceModal(true)
              }}
              onInsertDictionary={() => {
                setDictionaryQuery("")
                setDebouncedDictionaryQuery("")
                setDictionaryBrowse(false)
                setSelectedDictionaryEntry(null)
                setShowInsertDictionaryModal(true)
              }}
              className="h-full"
            />
          )}
        </div>

        {/* Insert Verse Modal */}
        {showInsertVerseModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
              <div className="flex items-center justify-between p-4 border-b border-border/60 bg-muted/20">
                <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                  <BookOpen className="size-5 text-primary" />
                  <span>Insertar Versículos</span>
                </h3>
                <button 
                  onClick={() => {
                    setShowInsertVerseModal(false)
                    setSelectedVerses([])
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground font-semibold px-2.5 py-1 bg-muted rounded-full transition-colors"
                >
                  Cerrar
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Selectors Panel */}
                <div className="w-full md:w-1/3 p-4 border-b md:border-b-0 md:border-r border-border/60 space-y-4 overflow-y-auto bg-muted/5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Versión de la Biblia</label>
                    <select
                      value={insertBibleId}
                      onChange={(e) => handleInsertBibleChange(Number(e.target.value))}
                      className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {insertBibles.map((b) => (
                        <option key={b.bibleId} value={b.bibleId}>
                          {b.name} ({b.abbr})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Libro</label>
                    <select
                      value={insertBookId || ""}
                      onChange={(e) => handleInsertBookChange(Number(e.target.value))}
                      className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {insertBooks.map((b) => (
                        <option key={b.bookId} value={b.bookId}>
                          {b.bookName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Capítulo</label>
                    <select
                      value={insertChapter}
                      onChange={(e) => {
                        setInsertChapter(Number(e.target.value))
                        setSelectedVerses([])
                      }}
                      className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {Array.from({ length: selectedBookObj?.chapters || 1 }, (_, i) => i + 1).map((ch) => (
                        <option key={ch} value={ch}>
                          Capítulo {ch}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Verses Scrollable list */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  <div className="flex items-center justify-between border-b border-border/30 pb-2 mb-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Selecciona los Versículos</label>
                    {insertVerses.length > 0 && (
                      <button
                        onClick={() => {
                          if (selectedVerses.length === insertVerses.length) {
                            setSelectedVerses([])
                          } else {
                            setSelectedVerses(insertVerses.map(v => ({ verse: v.verse, text: v.text })))
                          }
                        }}
                        className="text-[10px] font-bold text-primary hover:underline"
                      >
                        {selectedVerses.length === insertVerses.length ? "Deseleccionar Todo" : "Seleccionar Todo"}
                      </button>
                    )}
                  </div>

                  {insertVerses.length === 0 ? (
                    <div className="flex items-center justify-center h-48 text-xs text-muted-foreground">
                      Cargando versículos...
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {insertVerses.map((v) => {
                        const isChecked = selectedVerses.some(sv => sv.verse === v.verse)
                        return (
                          <div 
                            key={v.id} 
                            onClick={() => {
                              if (isChecked) {
                                setSelectedVerses(selectedVerses.filter(sv => sv.verse !== v.verse))
                              } else {
                                setSelectedVerses([...selectedVerses, { verse: v.verse, text: v.text }].sort((a, b) => a.verse - b.verse))
                              }
                            }}
                            className={cn(
                              "flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all active:scale-[0.99]",
                              isChecked 
                                ? "bg-primary/5 border-primary/30" 
                                : "bg-card hover:bg-muted/40 border-border/40"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              readOnly
                              className="mt-1 size-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary shrink-0"
                            />
                            <div className="text-xs leading-relaxed text-foreground">
                              <span className="font-extrabold text-primary mr-1.5">{v.verse}</span>
                              {v.text}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-border/60 bg-muted/20 flex justify-end gap-2.5">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowInsertVerseModal(false)
                    setSelectedVerses([])
                  }}
                  className="h-9 px-4 text-xs font-semibold"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    if (selectedVerses.length === 0) return
                    const bookName = selectedBookObj?.bookName || "Libro"
                    const bibleAbbr = selectedBibleObj?.abbr || "RVR1960"
                    
                    const verseNumbers = selectedVerses.map(v => v.verse)
                    const minVerse = Math.min(...verseNumbers)
                    const maxVerse = Math.max(...verseNumbers)
                    const isRange = maxVerse - minVerse === verseNumbers.length - 1
                    const verseRefStr = isRange && verseNumbers.length > 1
                      ? `${minVerse}-${maxVerse}`
                      : verseNumbers.join(",")
                    
                    const reference = `${bookName} ${insertChapter}:${verseRefStr}`
                    const versesText = selectedVerses.map(v => `<strong>${v.verse}</strong> ${v.text}`).join(" ")

                    const htmlBlock = `<blockquote><strong>${reference} (${bibleAbbr})</strong><br/>${versesText}</blockquote><p><br></p>`
                    insertBlockIntoEditingNote(htmlBlock)

                    setShowInsertVerseModal(false)
                    setSelectedVerses([])
                  }}
                  disabled={selectedVerses.length === 0}
                  className="h-9 px-4 text-xs font-semibold bg-primary hover:bg-primary/95 text-primary-foreground shadow-md"
                >
                  Insertar ({selectedVerses.length} seleccionados)
                </Button>
              </div>
            </div>
          </div>
        )}

        {showInsertReferenceModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
              <div className="flex items-center justify-between p-4 border-b border-border/60 bg-muted/20">
                <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                  <Link2 className="size-5 text-primary" />
                  <span>Insertar referencias</span>
                </h3>
                <button
                  onClick={() => {
                    setShowInsertReferenceModal(false)
                    setSelectedReferences([])
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground font-semibold px-2.5 py-1 bg-muted rounded-full transition-colors"
                >
                  Cerrar
                </button>
              </div>

              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                <div className="w-full md:w-1/3 p-4 border-b md:border-b-0 md:border-r border-border/60 space-y-4 overflow-y-auto bg-muted/5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Biblia</label>
                    <select
                      value={insertBibleId}
                      onChange={(e) => handleInsertBibleChange(Number(e.target.value))}
                      className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {insertBibles.map((b) => (
                        <option key={b.bibleId} value={b.bibleId}>{b.name} ({b.abbr})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Libro</label>
                    <select
                      value={insertBookId || ""}
                      onChange={(e) => handleInsertBookChange(Number(e.target.value))}
                      className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {insertBooks.map((b) => (
                        <option key={b.bookId} value={b.bookId}>{b.bookName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Capítulo</label>
                      <select
                        value={insertChapter}
                        onChange={(e) => {
                          setInsertChapter(Number(e.target.value))
                          setInsertReferenceVerse(1)
                          setSelectedReferences([])
                        }}
                        className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {Array.from({ length: selectedBookObj?.chapters || 1 }, (_, i) => i + 1).map((ch) => (
                          <option key={ch} value={ch}>{ch}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Versículo</label>
                      <Input
                        type="number"
                        min={1}
                        value={insertReferenceVerse}
                        onChange={(e) => {
                          setInsertReferenceVerse(Math.max(1, Number(e.target.value) || 1))
                          setSelectedReferences([])
                        }}
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  <div className="flex items-center justify-between border-b border-border/30 pb-2 mb-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Referencias encontradas
                    </label>
                    {insertReferences.length > 0 && (
                      <button
                        onClick={() => {
                          setSelectedReferences(
                            selectedReferences.length === insertReferences.length ? [] : insertReferences,
                          )
                        }}
                        className="text-[10px] font-bold text-primary hover:underline"
                      >
                        {selectedReferences.length === insertReferences.length ? "Deseleccionar Todo" : "Seleccionar Todo"}
                      </button>
                    )}
                  </div>

                  {referencesLoading ? (
                    <div className="flex items-center justify-center h-48 text-xs text-muted-foreground">
                      <Loader2 className="mr-2 size-4 animate-spin text-primary" />
                      Cargando referencias...
                    </div>
                  ) : insertReferences.length === 0 ? (
                    <div className="flex items-center justify-center h-48 text-xs text-muted-foreground">
                      No hay referencias para este versículo.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {insertReferences.map((ref, index) => {
                        const isChecked = selectedReferenceExists(ref)
                        return (
                          <div
                            key={`${ref.book_id}-${ref.chapter}-${ref.verse}-${index}`}
                            onClick={() => {
                              if (isChecked) {
                                setSelectedReferences(selectedReferences.filter((item) => !(
                                  item.book_id === ref.book_id && item.chapter === ref.chapter && item.verse === ref.verse
                                )))
                              } else {
                                setSelectedReferences([...selectedReferences, ref])
                              }
                            }}
                            className={cn(
                              "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all active:scale-[0.99]",
                              isChecked ? "bg-primary/5 border-primary/30" : "bg-card hover:bg-muted/40 border-border/40",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              readOnly
                              className="mt-1 size-4 rounded border-gray-300 accent-primary shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-extrabold text-primary">
                                {ref.book_name} {ref.chapter}:{ref.verse}
                              </div>
                              <div className="mt-1 text-xs leading-relaxed text-foreground">{ref.text}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-border/60 bg-muted/20 flex justify-end gap-2.5">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowInsertReferenceModal(false)
                    setSelectedReferences([])
                  }}
                  className="h-9 px-4 text-xs font-semibold"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    const bookName = selectedBookObj?.bookName || "Libro"
                    const bibleAbbr = selectedBibleObj?.abbr || "RVR1960"
                    const source = `${bookName} ${insertChapter}:${insertReferenceVerse}`
                    insertBlockIntoEditingNote(formatReferenceInsertion(source, selectedReferences, bibleAbbr))
                    setShowInsertReferenceModal(false)
                    setSelectedReferences([])
                  }}
                  disabled={selectedReferences.length === 0}
                  className="h-9 px-4 text-xs font-semibold bg-primary hover:bg-primary/95 text-primary-foreground shadow-md"
                >
                  Insertar ({selectedReferences.length})
                </Button>
              </div>
            </div>
          </div>
        )}

        {showInsertDictionaryModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-3xl h-[82vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
              <div className="flex items-center justify-between p-4 border-b border-border/60 bg-muted/20">
                <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                  <Languages className="size-5 text-primary" />
                  <span>Insertar del diccionario</span>
                </h3>
                <button
                  onClick={() => {
                    setShowInsertDictionaryModal(false)
                    setSelectedDictionaryEntry(null)
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground font-semibold px-2.5 py-1 bg-muted rounded-full transition-colors"
                >
                  Cerrar
                </button>
              </div>

              <div className="border-b border-border/60 p-4 space-y-3 bg-muted/5">
                <div className="relative">
                  <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input
                    value={dictionaryQuery}
                    onChange={(e) => {
                      setDictionaryQuery(e.target.value)
                      if (e.target.value) setDictionaryBrowse(false)
                    }}
                    placeholder="G25, H430, agapao, shalom..."
                    className="h-11 pl-9"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {DICTIONARY_LANG_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setDictionaryLang(opt.id)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
                        dictionaryLang === opt.id
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setDictionaryBrowse(true)}
                    className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary"
                  >
                    Explorar
                  </button>
                  {!dictionaryShouldFetch && DICTIONARY_EXAMPLES.map((example) => (
                    <button
                      key={example}
                      onClick={() => setDictionaryQuery(example)}
                      className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {!dictionaryShouldFetch ? (
                  <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                    Busca una entrada Strong o explora el diccionario para insertarla en tu nota.
                  </div>
                ) : dictionaryLoading ? (
                  <div className="flex items-center justify-center h-48 text-xs text-muted-foreground">
                    <Loader2 className="mr-2 size-4 animate-spin text-primary" />
                    Buscando...
                  </div>
                ) : dictionaryEntries.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Sin resultados.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {dictionaryEntries.map((entry) => {
                      const isPicked = selectedDictionaryEntry?.strongCode === entry.strongCode
                      const preview = parseDictionaryDefinition(entry.definition)[0]?.text ?? entry.definition
                      return (
                        <div
                          key={entry.strongCode}
                          onClick={() => setSelectedDictionaryEntry(entry)}
                          className={cn(
                            "rounded-xl border p-3 cursor-pointer transition-colors",
                            isPicked ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/40",
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-extrabold text-primary">
                              {entry.strongCode}
                            </span>
                            <span className="font-extrabold text-sm text-foreground">{entry.lemma}</span>
                            <span className="text-xs text-muted-foreground">{entry.transliteration}</span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{preview}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setDictionaryPage((page) => Math.max(1, page - 1))}
                    disabled={dictionaryPage <= 1}
                    className="h-9 px-3 text-xs font-semibold"
                  >
                    Anterior
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {dictionaryPage} / {dictionaryData?.totalPages ?? 1}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setDictionaryPage((page) => page + 1)}
                    disabled={dictionaryPage >= (dictionaryData?.totalPages ?? 1)}
                    className="h-9 px-3 text-xs font-semibold"
                  >
                    Siguiente
                  </Button>
                </div>
                <div className="flex gap-2.5">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowInsertDictionaryModal(false)
                      setSelectedDictionaryEntry(null)
                    }}
                    className="h-9 px-4 text-xs font-semibold"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => {
                      if (!selectedDictionaryEntry) return
                      insertBlockIntoEditingNote(formatDictionaryInsertion(selectedDictionaryEntry))
                      setShowInsertDictionaryModal(false)
                      setSelectedDictionaryEntry(null)
                    }}
                    disabled={!selectedDictionaryEntry}
                    className="h-9 px-4 text-xs font-semibold bg-primary hover:bg-primary/95 text-primary-foreground shadow-md"
                  >
                    {selectedDictionaryEntry ? `Insertar ${selectedDictionaryEntry.strongCode}` : "Insertar"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    )
  }

  // 1. Bookshelf Grid Mode (if no active notebook)
  if (activeNotebookId === null) {
    return (
      <div className={cn("flex flex-col h-full overflow-hidden relative", embedded ? "bg-background" : "bg-card/20")}>
        <header className={cn("flex items-center justify-between border-b border-border/60 p-4 shrink-0", embedded ? "bg-background" : "bg-card/30 backdrop-blur-md")}>
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <Book className="size-5 text-primary shrink-0" />
              <h2 className="text-lg font-bold text-foreground tracking-tight">Mis libretas</h2>
            </div>
            {embedded ? (
              <p className="text-sm text-muted-foreground pl-7">Cuadernos de apuntes y estudio bíblico.</p>
            ) : null}
          </div>
            <Button 
            onClick={() => {
              setModalMode("create")
              setConfigName("")
              setConfigCover("grad-purple")
              setCustomCoverUrl("")
              setShowConfigModal(true)
            }}
            size="sm"
            className="gap-1.5 bg-primary/90 hover:bg-primary shadow-md active:scale-95 shrink-0"
          >
            <FolderPlus className="size-4" />
            <span>Nueva</span>
          </Button>
        </header>

        {/* Bookshelf Scrollable area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {notebooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
              <div className="size-16 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10 text-primary/40">
                <Book className="size-8" />
              </div>
              <div className="max-w-xs space-y-1">
                <h3 className="font-bold text-foreground">Tu estantería está vacía</h3>
                <p className="text-xs text-muted-foreground">Crea tu primera libreta para comenzar a tomar apuntes y devocionales de estudio.</p>
              </div>
              <Button 
                onClick={() => {
                  setModalMode("create")
                  setConfigName("")
                  setConfigCover("grad-purple")
                  setCustomCoverUrl("")
                  setShowConfigModal(true)
                }}
                size="sm"
                className="gap-1.5 mt-2"
              >
                <Plus className="size-4" />
                Crear Libreta
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 justify-items-center">
              {notebooks.map((n) => (
                <div key={n.id} className="flex flex-col items-center gap-2 group relative">
                  
                  {/* Floating Action Menu */}
                  <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/45 backdrop-blur-[2px] rounded-lg p-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setModalMode("edit")
                        setActiveNotebookId(n.id)
                        setConfigName(n.name)
                        setConfigCover(n.coverImage || "grad-purple")
                        if (n.coverImage && n.coverImage.startsWith("http")) {
                          setCustomCoverUrl(n.coverImage)
                        } else {
                          setCustomCoverUrl("")
                        }
                        setShowConfigModal(true)
                      }}
                      className="p-1 text-white hover:text-primary transition-colors"
                      title="Editar libreta"
                    >
                      <Edit2 className="size-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteNotebook(n.id, n.name, e)}
                      className="p-1 text-white hover:text-destructive transition-colors"
                      title="Eliminar libreta"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>

                  <BookCover 
                    title={n.name}
                    coverImage={n.coverImage}
                    onClick={() => setActiveNotebookId(n.id)}
                  />
                  
                  <span className="text-xs font-bold text-foreground text-center truncate w-28 drop-shadow-sm">
                    {n.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Config Modal (Create or Edit Notebook) */}
        {showConfigModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-scale-in">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-base text-foreground flex items-center gap-1.5">
                  <Sparkles className="size-4 text-primary animate-pulse" />
                  {modalMode === "create" ? "Nueva Libreta de Estudio" : "Editar Libreta"}
                </h3>
                <button 
                  onClick={() => setShowConfigModal(false)}
                  className="text-xs text-muted-foreground hover:text-foreground font-semibold px-2 py-1 bg-muted rounded-full transition-colors"
                >
                  Cerrar
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Nombre del Cuaderno</label>
                  <Input 
                    value={configName}
                    onChange={(e) => setConfigName(e.target.value)}
                    placeholder="Ej. Apuntes de Proverbios, Teología..."
                    className="h-10"
                    autoFocus
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Portada Prediseñada</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_COVERS.map(cover => (
                      <button
                        key={cover.id}
                        onClick={() => {
                          setConfigCover(cover.id)
                          setCustomCoverUrl("")
                        }}
                        className={cn(
                          "h-10 rounded-lg text-[10px] font-bold text-white transition-all overflow-hidden relative border border-transparent shadow-sm flex items-center justify-center p-1",
                          cover.class,
                          configCover === cover.id && !customCoverUrl ? "ring-2 ring-primary border-white" : "opacity-85 hover:opacity-100"
                        )}
                      >
                        {cover.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">O URL de Imagen de Portada (Opcional)</label>
                  <Input 
                    value={customCoverUrl}
                    onChange={(e) => setCustomCoverUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="h-10 text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <Button 
                  variant="ghost" 
                  onClick={() => setShowConfigModal(false)}
                  className="h-9 px-4 text-xs font-semibold"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveNotebook}
                  disabled={savingNotebook || !configName.trim()}
                  className="h-9 px-4 text-xs font-semibold bg-primary hover:bg-primary/90 shadow-md"
                >
                  {savingNotebook ? <Loader2 className="size-4 animate-spin" /> : "Guardar Libreta"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // 2. Notebook Interior / Note List Mode (when activeNotebookId is selected)
  return (
    <div className={cn("flex flex-col h-full overflow-hidden", embedded ? "bg-background" : "bg-card/25")}>
      <header className={cn("flex flex-col gap-3 border-b border-border/60 p-4 shrink-0", embedded ? "bg-background" : "bg-card/40 backdrop-blur-md")}>
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setActiveNotebookId(null)
              setSearchQuery("")
            }}
            className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            <span>Volver a Estantería</span>
          </Button>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setModalMode("edit")
                setConfigName(selectedNotebook?.name || "")
                setConfigCover(selectedNotebook?.coverImage || "grad-purple")
                if (selectedNotebook?.coverImage && selectedNotebook.coverImage.startsWith("http")) {
                  setCustomCoverUrl(selectedNotebook.coverImage)
                } else {
                  setCustomCoverUrl("")
                }
                setShowConfigModal(true)
              }}
              className="size-8"
              title="Configurar Libreta"
            >
              <Edit2 className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => selectedNotebook && handleDeleteNotebook(selectedNotebook.id, selectedNotebook.name)}
              className="size-8 text-destructive hover:bg-destructive/10"
              title="Eliminar Libreta"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Selected Notebook info and Note Creator */}
        <div className="flex items-center gap-3.5 pt-1">
          <BookCover 
            title={selectedNotebook?.name || ""}
            coverImage={selectedNotebook?.coverImage}
            className="w-12 h-16 shrink-0 shadow pointer-events-none"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-extrabold text-foreground truncate tracking-tight">{selectedNotebook?.name}</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {notes.length} {notes.length === 1 ? "nota" : "notas"} · {totalWords} palabras
            </p>
          </div>

          <div className="shrink-0">
            {isCreatingNote ? (
              <div className="flex items-center gap-1.5 animate-scale-in">
                <Input
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  placeholder="Título..."
                  className="h-8 text-xs w-32 md:w-40"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateNote()
                    if (e.key === "Escape") setIsCreatingNote(false)
                  }}
                />
                <Button size="sm" className="h-8 px-2.5 text-xs bg-primary hover:bg-primary/95" onClick={handleCreateNote}>
                  +
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreatingNote(true)}
                className="h-8 gap-1 text-xs border-dashed"
              >
                <Plus className="size-3.5" />
                <span>Nueva Nota</span>
              </Button>
            )}
          </div>
        </div>

        {/* Notebook search bar */}
        <div className="relative mt-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground/60" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar apuntes o contenido..."
            className="h-9 pl-9 pr-4 text-xs bg-card/30"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            ["recent", "Recientes"],
            ["title", "A-Z"],
            ["long", "Largas"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSortBy(key as "recent" | "title" | "long")}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-bold transition-colors",
                sortBy === key
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-card/40 text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto p-4">
        {notesLoading ? (
          <div className="flex h-32 items-center justify-center text-xs text-muted-foreground gap-2">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span>Cargando notas de la libreta...</span>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground space-y-2">
            <FileText className="mx-auto size-7 opacity-35 text-primary" />
            <p className="text-xs">No hay notas que coincidan.</p>
            <Button
              variant="link"
              onClick={() => setIsCreatingNote(true)}
              className="h-auto text-xs p-0 text-primary font-bold hover:underline"
            >
              Crea una nueva nota
            </Button>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {filteredNotes.map((note) => {
              const pinned = isNotePinned(note.tags)
              return (
              <li
                key={note.id}
                onClick={() =>
                  setEditingNote({
                    id: note.id,
                    title: note.title,
                    content: note.content,
                    tags: note.tags,
                  })
                }
                className="group flex flex-col gap-2 rounded-xl border border-border/50 bg-card/30 p-3.5 hover:bg-accent/40 cursor-pointer transition-all hover:scale-[1.01] hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 min-w-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {pinned ? <Pin className="size-3.5 shrink-0 text-primary" /> : null}
                      <h4 className="truncate text-sm font-bold text-foreground tracking-tight">
                        {note.title || "Sin título"}
                      </h4>
                    </div>
                    <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground/70">
                      {estimateNoteReadMinutes(note.content)} min · {countNoteWords(note.content)} palabras
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleTogglePin(note, e)}
                    className={cn(
                      "size-6 shrink-0 rounded flex items-center justify-center transition-colors",
                      pinned ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
                    )}
                    title={pinned ? "Desfijar nota" : "Fijar nota"}
                  >
                    {pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setMoveTarget(note)
                    }}
                    className="size-6 shrink-0 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary flex items-center justify-center transition-colors"
                    title="Mover nota"
                  >
                    <FolderInput className="size-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleShareNote(note, e)}
                    className="size-6 shrink-0 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary flex items-center justify-center transition-colors"
                    title="Compartir nota"
                  >
                    <Share2 className="size-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteNote(note.id, note.title, e)}
                    className="size-6 shrink-0 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                <div className="flex gap-1.5 flex-wrap">
                  {parseNoteTags(note.tags).map((tId) => {
                    const tg = AVAILABLE_TAGS.find(x => x.id === tId)
                    if (!tg) return null
                    return <span key={tId} className={cn("text-[9px] px-2 py-0.5 rounded-full font-bold shadow-xs", tg.color)}>{tg.label}</span>
                  })}
                </div>

                <p className="line-clamp-2 text-xs text-muted-foreground/80 leading-relaxed">
                  {note.content
                    ? stripNotePreview(note.content)
                    : "Nota vacía"}
                </p>

                <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/30 mt-0.5 text-[10px] text-muted-foreground/60 font-semibold">
                  <Calendar className="size-3" />
                  <span>Actualizado: {new Date(note.updatedAt).toLocaleDateString()}</span>
                  <span className="ml-auto text-primary cursor-pointer" onClick={(e) => handleExportPdf(note, e)}>
                    PDF
                  </span>
                </div>
              </li>
            )})}
          </ul>
        )}
      </div>

      {moveTarget ? (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl animate-scale-in">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-base text-foreground">Mover nota</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{moveTarget.title || "Sin título"}</p>
              </div>
              <button
                onClick={() => setMoveTarget(null)}
                className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Cerrar
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-2">
              {notebooks.filter((nb) => nb.id !== activeNotebookId).length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No hay otra libreta disponible.</p>
              ) : (
                notebooks
                  .filter((nb) => nb.id !== activeNotebookId)
                  .map((nb) => (
                    <button
                      key={nb.id}
                      type="button"
                      onClick={() => handleMoveNote(nb.id)}
                      className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-3 py-3 text-left text-sm font-bold text-foreground hover:bg-accent"
                    >
                      <span className="truncate">{nb.name}</span>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Config Modal (Create or Edit Notebook) */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-foreground flex items-center gap-1.5">
                <Sparkles className="size-4 text-primary animate-pulse" />
                {modalMode === "create" ? "Nueva Libreta de Estudio" : "Editar Libreta"}
              </h3>
              <button 
                onClick={() => setShowConfigModal(false)}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold px-2 py-1 bg-muted rounded-full transition-colors"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Nombre del Cuaderno</label>
                <Input 
                  value={configName}
                  onChange={(e) => setConfigName(e.target.value)}
                  placeholder="Ej. Apuntes de Proverbios, Teología..."
                  className="h-10"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Portada Prediseñada</label>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_COVERS.map(cover => (
                    <button
                      key={cover.id}
                      onClick={() => {
                        setConfigCover(cover.id)
                        setCustomCoverUrl("")
                      }}
                      className={cn(
                        "h-10 rounded-lg text-[10px] font-bold text-white transition-all overflow-hidden relative border border-transparent shadow-sm flex items-center justify-center p-1",
                        cover.class,
                        configCover === cover.id && !customCoverUrl ? "ring-2 ring-primary border-white" : "opacity-85 hover:opacity-100"
                      )}
                    >
                      {cover.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">O URL de Imagen de Portada (Opcional)</label>
                <div className="flex gap-2">
                  <Input 
                    value={customCoverUrl}
                    onChange={(e) => setCustomCoverUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="h-10 text-xs flex-1"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="cover-upload"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setIsUploadingCover(true)
                      try {
                        const formData = new FormData()
                        formData.append("file", file)
                        const res = await fetch("/api/upload", {
                          method: "POST",
                          body: formData
                        })
                        if (!res.ok) throw new Error("Error al subir imagen")
                        const data = await res.json()
                        setCustomCoverUrl(data.url)
                        setConfigCover("")
                      } catch (err) {
                        console.error(err)
                        alert("Hubo un problema al subir la imagen")
                      } finally {
                        setIsUploadingCover(false)
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 px-3"
                    disabled={isUploadingCover}
                    onClick={() => document.getElementById("cover-upload")?.click()}
                  >
                    {isUploadingCover ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <Button 
                variant="ghost" 
                onClick={() => setShowConfigModal(false)}
                className="h-9 px-4 text-xs font-semibold"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveNotebook}
                disabled={savingNotebook || isUploadingCover || !configName.trim()}
                className="h-9 px-4 text-xs font-semibold bg-primary hover:bg-primary/90 shadow-md"
              >
                {savingNotebook ? <Loader2 className="size-4 animate-spin" /> : "Guardar Libreta"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
