"use client"

import * as React from "react"
import { useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  Heart, 
  Plus, 
  Trash2, 
  Edit, 
  Calendar, 
  BookOpen, 
  Loader2, 
  ArrowLeft,
  ChevronRight,
  Smile
} from "lucide-react"

interface Devotional {
  id: number
  title: string
  emotion: string | null
  verseRef: string | null
  content: {
    reflection: string
    application: string
    planId?: number
    planDay?: number
  } | string
  createdAt: string
}

function getDevotionalContent(dev: Devotional) {
  if (!dev.content) return { reflection: "", application: "" }
  if (typeof dev.content === "string") {
    try { return JSON.parse(dev.content) } catch { return { reflection: "", application: "" } }
  }
  return dev.content
}

const EMOTIONS = [
  { name: "Agradecido", emoji: "🙏", color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300" },
  { name: "Alegre", emoji: "😊", color: "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300" },
  { name: "Cansado", emoji: "🥱", color: "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300" },
  { name: "Triste", emoji: "😢", color: "bg-indigo-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-300" },
  { name: "Ansioso", emoji: "😰", color: "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300" },
  { name: "Confiado", emoji: "🛡️", color: "bg-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-300" }
]

export function Devotionals() {
  const { data: devData, mutate: mutateDevotionals, isLoading } = useSWR<{ devotionals: Devotional[] }>(
    "/api/devotionals",
    fetcher
  )
  const devotionals = devData?.devotionals ?? []

  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  
  // Form State
  const [title, setTitle] = useState("")
  const [emotion, setEmotion] = useState<string | null>(null)
  const [verseRef, setVerseRef] = useState("")
  const [reflection, setReflection] = useState("")
  const [application, setApplication] = useState("")
  
  const [saving, setSaving] = useState(false)
  const [selectedDevotional, setSelectedDevotional] = useState<Devotional | null>(null)

  function openNewForm() {
    setTitle("")
    setEmotion(null)
    setVerseRef("")
    setReflection("")
    setApplication("")
    setEditingId(null)
    setIsEditing(true)
    setSelectedDevotional(null)
  }

  function openEditForm(dev: Devotional) {
    const content = getDevotionalContent(dev)
    setTitle(dev.title)
    setEmotion(dev.emotion)
    setVerseRef(dev.verseRef || "")
    setReflection(content.reflection || "")
    setApplication(content.application || "")
    setEditingId(dev.id)
    setIsEditing(true)
    setSelectedDevotional(null)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    setSaving(true)
    const url = editingId ? `/api/devotionals/${editingId}` : "/api/devotionals"
    const method = editingId ? "PUT" : "POST"
    const body = {
      title: title.trim(),
      emotion,
      verseRef: verseRef.trim(),
      content: { reflection, application }
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      await mutateDevotionals()
      setIsEditing(false)
      setEditingId(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al guardar el devocional")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm("¿Estás seguro de eliminar esta entrada del diario espiritual?")) return

    try {
      const res = await fetch(`/api/devotionals/${id}`, {
        method: "DELETE"
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      await mutateDevotionals()
      if (selectedDevotional?.id === id) {
        setSelectedDevotional(null)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar")
    }
  }

  // View specific devotional details
  if (selectedDevotional) {
    const emotionObj = EMOTIONS.find(e => e.name === selectedDevotional.emotion)
    const content = getDevotionalContent(selectedDevotional)
    return (
      <div className="space-y-6 animate-fade-in p-1 md:p-4">
        <header className="flex items-center justify-between border-b border-border pb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedDevotional(null)}
            className="gap-2"
          >
            <ArrowLeft className="size-4" />
            <span>Volver al Diario</span>
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEditForm(selectedDevotional)}
              className="gap-1.5"
            >
              <Edit className="size-4" />
              <span>Editar</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                handleDelete(selectedDevotional.id, e)
                setSelectedDevotional(null)
              }}
              className="gap-1.5 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-4" />
              <span>Eliminar</span>
            </Button>
          </div>
        </header>

        <div className="space-y-4 max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
              <Calendar className="size-3.5" />
              {new Date(selectedDevotional.createdAt).toLocaleDateString()}
            </span>
            {selectedDevotional.emotion && emotionObj && (
              <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold shadow-sm ${emotionObj.color}`}>
                <span>{emotionObj.emoji}</span>
                <span>{emotionObj.name}</span>
              </span>
            )}
            {selectedDevotional.verseRef && (
              <span className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary shadow-sm">
                <BookOpen className="size-3.5" />
                {selectedDevotional.verseRef}
              </span>
            )}
          </div>

          <h1 className="text-3xl font-extrabold text-foreground">{selectedDevotional.title}</h1>

          <div className="space-y-6 pt-4 border-t border-border">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Reflexión
              </h3>
              <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap font-serif">
                {content.reflection || "Sin reflexión."}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Instrucción / Aplicación Práctica
              </h3>
              <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap bg-primary/5 p-4 rounded-xl border border-primary/10">
                {content.application || "Sin aplicación práctica definida."}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Create / Edit Form View
  if (isEditing) {
    return (
      <div className="space-y-6 animate-fade-in p-1 md:p-4">
        <header className="flex items-center justify-between border-b border-border pb-4">
          <h2 className="text-2xl font-bold text-foreground">
            {editingId ? "Editar Entrada del Diario" : "Nueva Entrada del Diario"}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(false)}
            className="gap-2"
          >
            <ArrowLeft className="size-4" />
            <span>Cancelar</span>
          </Button>
        </header>

        <form onSubmit={handleSave} className="space-y-5 max-w-3xl">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Título del Devocional
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Caminando en Fe"
              required
              className="h-10"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
              ¿Cómo te sientes hoy? (Estado de Ánimo)
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
              {EMOTIONS.map((e) => (
                <button
                  key={e.name}
                  type="button"
                  onClick={() => setEmotion(emotion === e.name ? null : e.name)}
                  className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border text-sm font-medium transition-all ${
                    emotion === e.name
                      ? "border-primary bg-primary/10 text-primary scale-105 shadow-sm"
                      : "border-border bg-card/40 text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  <span className="text-2xl">{e.emoji}</span>
                  <span className="text-xs">{e.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Pasaje o Versículo Clave
            </label>
            <Input
              value={verseRef}
              onChange={(e) => setVerseRef(e.target.value)}
              placeholder="Ej: Salmos 23:1 o Juan 3:16"
              className="h-10"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              ¿Qué te enseña Dios hoy? (Reflexión)
            </label>
            <Textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="Escribe tus reflexiones, lecciones o meditaciones del pasaje..."
              className="min-h-[150px] resize-none focus-visible:ring-primary/55 font-serif"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              ¿Cómo lo aplicarás a tu vida? (Aplicación)
            </label>
            <Textarea
              value={application}
              onChange={(e) => setApplication(e.target.value)}
              placeholder="Escribe acciones específicas o instrucciones prácticas para tu vida diaria..."
              className="min-h-[100px] resize-none focus-visible:ring-primary/55 bg-primary/5 border-primary/10"
            />
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto h-10 gap-2 px-8"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <span>Guardar Entrada</span>
            )}
          </Button>
        </form>
      </div>
    )
  }

  // History timeline view
  return (
    <div className="space-y-6 p-1 md:p-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            Diario Espiritual <Heart className="size-6 text-primary fill-primary/10" />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registra tus reflexiones, oraciones y devocionales.
          </p>
        </div>
        <Button onClick={openNewForm} className="gap-1.5">
          <Plus className="size-4" />
          <span>Escribir Entrada</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin text-primary" />
          Cargando tu diario espiritual...
        </div>
      ) : devotionals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground bg-card/25 max-w-xl mx-auto mt-8">
          <Smile className="mx-auto mb-3 size-12 text-muted-foreground/45" />
          <h3 className="text-lg font-bold text-foreground mb-1">Empieza tu Diario Espiritual</h3>
          <p className="text-sm max-w-sm mx-auto mb-6">
            Escribir un diario te ayuda a meditar en la palabra de Dios y recordar lo aprendido.
          </p>
          <Button onClick={openNewForm} className="gap-1.5">
            <Plus className="size-4" />
            <span>Crear Primer Devocional</span>
          </Button>
        </div>
      ) : (
        <div className="relative border-l border-border pl-6 space-y-8 max-w-3xl mt-6">
          {devotionals.map((dev) => {
            const emotionObj = EMOTIONS.find(e => e.name === dev.emotion)
            const content = getDevotionalContent(dev)
            return (
              <div 
                key={dev.id} 
                onClick={() => setSelectedDevotional(dev)}
                className="relative group cursor-pointer"
              >
                {/* Timeline Dot */}
                <div className="absolute -left-[31px] top-1 flex size-4 items-center justify-center rounded-full border border-border bg-background transition-colors group-hover:border-primary group-hover:bg-primary/10">
                  <div className="size-2 rounded-full bg-muted-foreground transition-colors group-hover:bg-primary" />
                </div>

                <div className="rounded-xl border border-border bg-card/60 p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.005] duration-200">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                          <Calendar className="size-3" />
                          {new Date(dev.createdAt).toLocaleDateString()}
                        </span>
                        {dev.emotion && emotionObj && (
                          <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.25 text-[10px] font-semibold ${emotionObj.color}`}>
                            <span>{emotionObj.emoji}</span>
                            <span>{emotionObj.name}</span>
                          </span>
                        )}
                        {content.planId && (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.25 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                            <Calendar className="size-3" />
                            Plan · Día {content.planDay}
                          </span>
                        )}
                        {dev.verseRef && (
                          <span className="flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.25 text-[10px] font-semibold text-primary">
                            <BookOpen className="size-3" />
                            {dev.verseRef}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {dev.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-2 leading-relaxed">
                        {content.reflection}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-primary transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditForm(dev)
                        }}
                      >
                        <Edit className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive transition-colors"
                        onClick={(e) => handleDelete(dev.id, e)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                      <ChevronRight className="size-5 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
