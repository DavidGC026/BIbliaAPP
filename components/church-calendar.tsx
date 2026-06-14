"use client"

import * as React from "react"
import { useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { localDatetimeToISO } from "@/lib/datetime"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, Plus, Loader2, MapPin, Trash2, Check, Users } from "lucide-react"

const CATEGORIES = [
  { id: "culto", label: "Culto" },
  { id: "oracion", label: "Oración" },
  { id: "jovenes", label: "Jóvenes" },
  { id: "ministerio", label: "Ministerio" },
  { id: "otro", label: "Otro" },
] as const

interface ChurchCalendarProps {
  isAdmin?: boolean
}

export function ChurchCalendar({ isAdmin = false }: ChurchCalendarProps) {
  const { data, mutate, isLoading } = useSWR<{ events: any[] }>("/api/events", fetcher)
  const { data: churchData } = useSWR<{ settings: { church_name: string; church_logo_url: string | null } }>(
    "/api/church-settings",
    fetcher,
  )
  const events = data?.events ?? []
  const churchLogo = churchData?.settings?.church_logo_url
  const churchName = churchData?.settings?.church_name

  const [isCreating, setIsCreating] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [location, setLocation] = useState("")
  const [category, setCategory] = useState<string>("culto")
  const [saving, setSaving] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !startTime) return
    setSaving(true)
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          startTime: localDatetimeToISO(startTime),
          endTime: endTime ? localDatetimeToISO(endTime) : null,
          location,
          category,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      await mutate()
      setIsCreating(false)
      setTitle("")
      setDescription("")
      setStartTime("")
      setEndTime("")
      setLocation("")
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al crear evento")
    } finally {
      setSaving(false)
    }
  }

  async function handleRsvp(eventId: number, status: "going" | "maybe" | "declined") {
    try {
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rsvp", eventId, status }),
      })
      mutate()
    } catch {
      alert("Error al confirmar asistencia")
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este evento?")) return
    try {
      await fetch(`/api/events?id=${id}`, { method: "DELETE" })
      mutate()
    } catch {
      alert("Error al eliminar")
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-1 md:p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            Calendario <Calendar className="size-7 text-violet-500" />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Eventos de la congregación y de tus grupos
            {churchName && churchName !== "BibliaAPP" ? ` · ${churchName}` : ""}
          </p>
          {churchLogo && (
            <img src={churchLogo} alt="" className="mt-2 size-8 rounded-lg object-contain" />
          )}
        </div>
        {isAdmin && !isCreating && (
          <Button onClick={() => setIsCreating(true)} className="gap-2">
            <Plus className="size-4" />
            Nuevo evento
          </Button>
        )}
      </div>

      {isCreating && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Crear evento</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título del evento" required />
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Inicio</label>
                <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Fin (opcional)</label>
                <Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ubicación" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : "Publicar"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="py-12 flex justify-center"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border">
          <Calendar className="size-12 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="font-bold text-lg">No hay eventos próximos</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Los eventos de la iglesia y de tus grupos aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((ev: {
            id: number
            source?: "church" | "group"
            title: string
            description?: string
            image_url?: string | null
            start_time: string
            end_time?: string | null
            location?: string
            category?: string
            group_name?: string
            going_count?: number
            my_rsvp?: string
          }) => {
            const isGroup = ev.source === "group"
            const eventKey = `${ev.source ?? "church"}-${ev.id}`
            return (
            <div key={eventKey} className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              {ev.image_url && (
                <img src={ev.image_url} alt="" className="w-full max-h-48 object-cover" />
              )}
              <div className="p-5">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                  {isGroup ? (
                    <span className="text-[10px] font-bold uppercase bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <Users className="size-3" />
                      {ev.group_name ?? "Grupo"}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase bg-violet-500/10 text-violet-600 px-2 py-0.5 rounded-full">
                      {CATEGORIES.find((c) => c.id === ev.category)?.label ?? ev.category}
                    </span>
                  )}
                  <h3 className="font-bold text-lg mt-2">{ev.title}</h3>
                  {ev.description && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{ev.description}</p>}
                  <p className="text-sm text-muted-foreground mt-2">
                    {new Date(ev.start_time).toLocaleString("es", { dateStyle: "full", timeStyle: "short" })}
                    {ev.end_time && (
                      <span>
                        {" "}– {new Date(ev.end_time).toLocaleTimeString("es", { timeStyle: "short" })}
                      </span>
                    )}
                  </p>
                  {ev.location && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="size-3.5 shrink-0" /> {ev.location}
                    </p>
                  )}
                  {!isGroup && (
                    <p className="text-xs text-muted-foreground mt-2">{ev.going_count ?? 0} confirmados</p>
                  )}
                  {isGroup && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Evento del grupo · edítalo desde Grupos → Calendario
                    </p>
                  )}
                </div>
                {isAdmin && !isGroup && (
                  <Button size="sm" variant="ghost" className="text-destructive shrink-0" onClick={() => handleDelete(ev.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
              {!isGroup && (
              <div className="flex gap-2 mt-4 flex-wrap">
                {(["going", "maybe", "declined"] as const).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={ev.my_rsvp === s ? "default" : "outline"}
                    onClick={() => handleRsvp(ev.id, s)}
                    className="gap-1"
                  >
                    {ev.my_rsvp === s && <Check className="size-3" />}
                    {s === "going" ? "Asistiré" : s === "maybe" ? "Tal vez" : "No podré"}
                  </Button>
                ))}
              </div>
              )}
              </div>
            </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
