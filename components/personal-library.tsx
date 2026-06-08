"use client"

import * as React from "react"
import { useState, useRef } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Loader2, Library, Plus, Image as ImageIcon, BookOpen, Clock, ChevronLeft, Trash2, Send } from "lucide-react"

interface ExternalBook {
  id: number
  title: string
  author: string
  cover_image: string | null
  status: string
  created_at: string
}

interface BookLog {
  id: number
  title: string | null
  pages_read: string | null
  chapter: string | null
  reflection: string | null
  created_at: string
}

export function PersonalLibrary() {
  const { data, isLoading, mutate } = useSWR<{ books: ExternalBook[] }>("/api/external-books", fetcher)
  const books = data?.books || []

  const [activeBookId, setActiveBookId] = useState<number | null>(null)
  const [isAddingBook, setIsAddingBook] = useState(false)

  if (activeBookId !== null) {
    return <BookDetailView bookId={activeBookId} onBack={() => setActiveBookId(null)} onBookDeleted={() => { setActiveBookId(null); mutate(); }} />
  }

  if (isAddingBook) {
    return <AddBookForm onBack={() => setIsAddingBook(false)} onSuccess={() => { setIsAddingBook(false); mutate(); }} />
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Library className="size-6 text-primary" />
            Libros de Estudio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lleva un registro de los libros físicos o externos que estás leyendo y guarda tus aprendizajes.
          </p>
        </div>
        <button
          onClick={() => setIsAddingBook(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-md"
        >
          <Plus className="size-4" />
          Añadir Libro
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : books.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 bg-card border border-border rounded-2xl">
          <Library className="size-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-bold mb-2">Tu biblioteca está vacía</h3>
          <p className="text-muted-foreground max-w-sm mb-6 text-sm">
            Empieza a catalogar los libros que estás leyendo para guardar tus anotaciones y progreso.
          </p>
          <button
            onClick={() => setIsAddingBook(true)}
            className="bg-accent hover:bg-accent/80 text-foreground px-5 py-2.5 rounded-xl font-medium transition-colors"
          >
            Agregar mi primer libro
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {books.map(book => (
            <div 
              key={book.id} 
              onClick={() => setActiveBookId(book.id)}
              className="group cursor-pointer flex flex-col gap-3"
            >
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-md group-hover:shadow-xl transition-all border border-border/50 bg-muted flex items-center justify-center">
                {book.cover_image ? (
                  <img src={book.cover_image} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <BookOpen className="size-10 text-muted-foreground/30" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div>
                <h4 className="font-bold text-sm leading-tight line-clamp-2">{book.title}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{book.author}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AddBookForm({ onBack, onSuccess }: { onBack: () => void, onSuccess: () => void }) {
  const [title, setTitle] = useState("")
  const [author, setAuthor] = useState("")
  const [coverImage, setCoverImage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const MAX_WIDTH = 400
        const scaleSize = MAX_WIDTH / img.width
        canvas.width = MAX_WIDTH
        canvas.height = img.height * scaleSize

        const ctx = canvas.getContext("2d")
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
        
        // Comprimir a JPEG calidad 0.7 para ahorrar espacio
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7)
        setCoverImage(dataUrl)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !author) return
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/external-books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, author, coverImage })
      })
      if (res.ok) onSuccess()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto animate-fade-in space-y-6">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ChevronLeft className="size-4" /> Volver a Biblioteca
      </button>

      <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
        <h2 className="text-2xl font-bold mb-6">Registrar Nuevo Libro</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col items-center gap-4 mb-6">
            <div 
              className="w-32 h-48 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/50 overflow-hidden cursor-pointer hover:bg-muted transition-colors relative"
              onClick={() => fileInputRef.current?.click()}
            >
              {coverImage ? (
                <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-muted-foreground">
                  <ImageIcon className="size-8 mb-2 opacity-50" />
                  <span className="text-[10px] font-bold text-center px-2 uppercase tracking-wider">Subir Portada</span>
                </div>
              )}
            </div>
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
          </div>

          <div>
            <label className="block text-sm font-bold text-muted-foreground mb-1.5">Título del Libro</label>
            <input required type="text" className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none" placeholder="Ej. El progreso del peregrino" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-bold text-muted-foreground mb-1.5">Autor</label>
            <input required type="text" className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none" placeholder="Ej. John Bunyan" value={author} onChange={e => setAuthor(e.target.value)} />
          </div>

          <button disabled={isSubmitting || !title || !author} type="submit" className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl disabled:opacity-50 transition-all hover:bg-primary/90 mt-4">
            {isSubmitting ? <Loader2 className="size-5 animate-spin mx-auto" /> : "Guardar Libro"}
          </button>
        </form>
      </div>
    </div>
  )
}

function BookDetailView({ bookId, onBack, onBookDeleted }: { bookId: number, onBack: () => void, onBookDeleted: () => void }) {
  const { data, isLoading, mutate } = useSWR<{ book: ExternalBook, logs: BookLog[] }>(`/api/external-books/${bookId}`, fetcher)
  
  const [isAddingLog, setIsAddingLog] = useState(false)
  const [logTitle, setLogTitle] = useState("")
  const [logPages, setLogPages] = useState("")
  const [logChapter, setLogChapter] = useState("")
  const [logReflection, setLogReflection] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="size-8 animate-spin text-primary" /></div>
  if (!data) return <div className="p-8 text-center text-destructive">Error cargando el libro.</div>

  const { book, logs } = data

  const handleDelete = async () => {
    if (!confirm("¿Eliminar este libro de tu biblioteca?")) return
    await fetch(`/api/external-books/${bookId}`, { method: "DELETE" })
    onBookDeleted()
  }

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!logReflection) return
    setIsSubmitting(true)
    try {
      await fetch(`/api/external-books/${bookId}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: logTitle, pages_read: logPages, chapter: logChapter, reflection: logReflection })
      })
      setIsAddingLog(false)
      setLogTitle("")
      setLogPages("")
      setLogChapter("")
      setLogReflection("")
      mutate()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-12">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ChevronLeft className="size-4" /> Biblioteca
      </button>

      <div className="flex flex-col md:flex-row gap-6 mb-8 bg-card border border-border p-6 rounded-3xl shadow-sm relative overflow-hidden">
        <button onClick={handleDelete} className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10">
          <Trash2 className="size-4" />
        </button>

        <div className="w-32 md:w-40 shrink-0 mx-auto md:mx-0">
          <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-lg border border-border/50 bg-muted">
            {book.cover_image ? (
              <img src={book.cover_image} alt={book.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex justify-center items-center"><BookOpen className="size-10 text-muted-foreground/30" /></div>
            )}
          </div>
        </div>
        <div className="flex-1 text-center md:text-left flex flex-col justify-center">
          <h1 className="text-3xl font-bold mb-1 text-foreground">{book.title}</h1>
          <p className="text-lg text-muted-foreground font-medium mb-4">{book.author}</p>
          <div className="flex flex-wrap gap-2 justify-center md:justify-start">
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wide">
              {book.status}
            </span>
            <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs font-bold flex items-center gap-1">
              <Clock className="size-3" /> Añadido {new Date(book.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Bitácora de Lectura</h2>
        {!isAddingLog && (
          <button onClick={() => setIsAddingLog(true)} className="text-sm font-bold bg-accent hover:bg-accent/80 px-4 py-2 rounded-xl transition-colors">
            + Nueva Reflexión
          </button>
        )}
      </div>

      {isAddingLog && (
        <form onSubmit={handleAddLog} className="bg-card border-2 border-primary/20 rounded-2xl p-5 mb-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-3">
              <input type="text" placeholder="Título de tu devocional/sesión (Opcional)" className="w-full bg-background border border-border font-bold rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none" value={logTitle} onChange={e => setLogTitle(e.target.value)} />
            </div>
            <div>
              <input type="text" placeholder="Páginas (ej. 10 a 25)" className="w-full bg-background border border-border text-sm rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none" value={logPages} onChange={e => setLogPages(e.target.value)} />
            </div>
            <div>
              <input type="text" placeholder="Capítulo (ej. 4)" className="w-full bg-background border border-border text-sm rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none" value={logChapter} onChange={e => setLogChapter(e.target.value)} />
            </div>
          </div>
          <textarea required placeholder="¿Qué aprendiste en esta lectura?" className="w-full bg-background border border-border rounded-xl px-4 py-3 min-h-[120px] focus:ring-2 focus:ring-primary focus:outline-none mb-4" value={logReflection} onChange={e => setLogReflection(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsAddingLog(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" disabled={isSubmitting || !logReflection} className="bg-primary text-primary-foreground px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50">
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Guardar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-5">
        {logs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aún no tienes notas para este libro.</p>
        ) : (
          logs.map(log => (
            <div key={log.id} className="bg-background border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="font-bold text-lg">{log.title || "Reflexión sin título"}</h3>
                <span className="text-xs text-muted-foreground font-medium">{new Date(log.created_at).toLocaleString()}</span>
              </div>
              <div className="flex gap-3 mb-4">
                {log.chapter && <span className="px-2 py-0.5 rounded-md bg-accent/50 text-[10px] font-bold uppercase">Capítulo {log.chapter}</span>}
                {log.pages_read && <span className="px-2 py-0.5 rounded-md bg-accent/50 text-[10px] font-bold uppercase">Págs: {log.pages_read}</span>}
              </div>
              <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed text-sm font-serif">{log.reflection}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
