"use client"

import * as React from "react"
import { useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { localDatetimeToISO } from "@/lib/datetime"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, Plus, Loader2, MapPin, Trash2, ImagePlus, Clock } from "lucide-react"

interface GroupCalendarProps {
  groupId: number
  canManage: boolean
}

export function GroupCalendar({ groupId, canManage }: GroupCalendarProps) {
  const { data, mutate, isLoading } = useSWR<{ events: any[] }>(
    `/api/groups/${groupId}/events`,
    fetcher,
  )
  const events = data?.events ?? []

  const [isCreating, setIsCreating] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [location, setLocation] = useState("")
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [saving, setSaving] = useState(false)

  async function uploadImage(file: File) {
    setUploadingImage(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("purpose", "group_event")
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error)
      setImageUrl(body.url)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al subir imagen")
    } finally {
      setUploadingImage(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !startTime) return
    setSaving(true)
    try {
      const res = await fetch(`/api/groups/${groupId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          imageUrl,
          startTime: localDatetimeToISO(startTime),
          endTime: endTime ? localDatetimeToISO(endTime) : null,
          location,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error)
      await mutate()
      setIsCreating(false)
      setTitle("")
      setDescription("")
      setStartTime("")
      setEndTime("")
      setLocation("")
      setImageUrl(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al crear evento")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(eventId: number) {
    if (!confirm("¿Eliminar este evento?")) return
    try {
      const res = await fetch(`/api/groups/${groupId}/events?eventId=${eventId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error((await res.json()).error)
      mutate()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Calendar className="size-5 text-violet-500" />
            Calendario del grupo
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Recibirás recordatorio 1 día antes y 2 horas antes de cada evento.
          </p>
        </div>
        {canManage && !isCreating && (
          <Button size="sm" onClick={() => setIsCreating(true)} className="gap-1.5 shrink-0">
            <Plus className="size-4" />
            Nuevo evento
          </Button>
        )}
      </div>

      {isCreating && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="font-semibold">Crear evento</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título del evento"
              required
            />
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción, horario, instrucciones..."
              className="min-h-[80px]"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Inicio</label>
                <Input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Fin (opcional)</label>
                <Input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ubicación (salón, Zoom, dirección...)"
            />
            {imageUrl && (
              <div className="relative rounded-lg overflow-hidden border border-border max-h-40">
                <img src={imageUrl} alt="" className="w-full object-cover max-h-40" />
                <button
                  type="button"
                  onClick={() => setImageUrl(null)}
                  className="absolute top-2 right-2 text-xs bg-background/90 px-2 py-1 rounded-md border"
                >
                  Quitar
                </button>
              </div>
            )}
            <div className="flex gap-2 justify-end flex-wrap">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                id={`group-event-image-${groupId}`}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) uploadImage(f)
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingImage}
                onClick={() => document.getElementById(`group-event-image-${groupId}`)?.click()}
                className="gap-1.5"
              >
                {uploadingImage ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ImagePlus className="size-4" />
                )}
                Imagen
              </Button>
              <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : "Publicar"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-10 rounded-xl border border-dashed border-border">
          <Calendar className="size-10 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No hay eventos programados en este grupo.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((ev: {
            id: number
            title: string
            description: string
            image_url: string | null
            start_time: string
            end_time: string | null
            location: string
            creator_name: string
          }) => (
            <div key={ev.id} className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              {ev.image_url && (
                <img src={ev.image_url} alt="" className="w-full max-h-48 object-cover" />
              )}
              <div className="p-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-lg">{ev.title}</h3>
                    {ev.description && (
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{ev.description}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1.5">
                      <Clock className="size-3.5 shrink-0" />
                      {new Date(ev.start_time).toLocaleString("es", {
                        dateStyle: "full",
                        timeStyle: "short",
                      })}
                      {ev.end_time && (
                        <span>
                          {" "}
                          – {new Date(ev.end_time).toLocaleTimeString("es", { timeStyle: "short" })}
                        </span>
                      )}
                    </p>
                    {ev.location && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="size-3.5 shrink-0" /> {ev.location}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Publicado por {ev.creator_name}
                    </p>
                  </div>
                  {canManage && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive shrink-0"
                      onClick={() => handleDelete(ev.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
