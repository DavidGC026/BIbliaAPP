"use client"

import * as React from "react"
import { useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { HeartHandshake, Plus, CheckCircle, Archive, Trash2, Loader2, Users } from "lucide-react"

interface Prayer {
  id: number
  title: string
  description: string
  status: "active" | "answered" | "archived"
  visibility?: "private" | "group"
  group_id?: number | null
  created_at: string
}

interface Group {
  id: number
  name: string
}

export function PrayerRequests() {
  const { data, mutate, isLoading } = useSWR<{ prayers: Prayer[] }>("/api/prayers", fetcher)
  const { data: groupsData } = useSWR<{ groups: Group[] }>("/api/groups", fetcher)
  const prayers = data?.prayers ?? []
  const groups = groupsData?.groups ?? []

  const [filter, setFilter] = useState<"active" | "answered" | "archived">("active")
  const [isCreating, setIsCreating] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [visibility, setVisibility] = useState<"private" | "group">("private")
  const [groupId, setGroupId] = useState<string>("")
  const [saving, setSaving] = useState(false)

  const filteredPrayers = prayers.filter((p) => p.status === filter)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    if (visibility === "group" && !groupId) {
      alert("Selecciona un grupo para compartir la petición")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/prayers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          visibility,
          groupId: visibility === "group" ? parseInt(groupId, 10) : null,
        }),
      })
      if (!res.ok) throw new Error("Error al crear")
      await mutate()
      setIsCreating(false)
      setTitle("")
      setDescription("")
      setVisibility("private")
      setGroupId("")
      setFilter("active")
    } catch {
      alert("Error al crear la petición")
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdateStatus(id: number, status: string) {
    try {
      await fetch("/api/prayers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      })
      await mutate()
    } catch {
      alert("Error al actualizar")
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar esta petición permanentemente?")) return
    try {
      await fetch(`/api/prayers?id=${id}`, { method: "DELETE" })
      await mutate()
    } catch {
      alert("Error al eliminar")
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-1 md:p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            Oración <HeartHandshake className="size-7 text-rose-500" />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tus peticiones delante de Dios — comparte con tu grupo para intercesión
          </p>
        </div>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white border-0">
            <Plus className="size-4" />
            <span>Nueva Petición</span>
          </Button>
        )}
      </div>

      {isCreating ? (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Nueva Petición de Oración</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-1 block">Motivo de Oración</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Por la salud de mi familia..."
                required
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Detalles adicionales</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Escribe más detalles si lo deseas..."
                className="min-h-[100px]"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block">Visibilidad</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility("private")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    visibility === "private"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  Privada
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility("group")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-1.5 ${
                    visibility === "group"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  <Users className="size-4" />
                  Compartir con grupo
                </button>
              </div>
            </div>
            {visibility === "group" && (
              <div>
                <label className="text-sm font-semibold mb-1 block">Grupo</label>
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="">Seleccionar grupo...</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : "Guardar Petición"}
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 p-1 bg-muted/40 rounded-lg w-fit flex-wrap">
            {(["active", "answered", "archived"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                  filter === f ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "active" ? "🔥 Activas" : f === "answered" ? "✨ Respondidas" : "📦 Archivo"} (
                {prayers.filter((p) => p.status === f).length})
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {isLoading ? (
              <div className="py-12 flex justify-center"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
            ) : filteredPrayers.length === 0 ? (
              <div className="text-center py-16 bg-card/50 rounded-2xl border border-dashed border-border">
                <HeartHandshake className="size-12 mx-auto text-muted-foreground/30 mb-3" />
                <h3 className="font-bold text-lg">No tienes peticiones en esta categoría</h3>
              </div>
            ) : (
              filteredPrayers.map((p) => (
                <div key={p.id} className="p-5 rounded-xl border border-border bg-card shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">{p.title}</h3>
                      {p.visibility === "group" && (
                        <span className="text-[10px] font-bold uppercase bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full">
                          Grupo
                        </span>
                      )}
                    </div>
                    {p.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{p.description}</p>}
                    <p className="text-xs text-muted-foreground pt-2">Creada el {new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap">
                    {p.status === "active" && (
                      <>
                        <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => handleUpdateStatus(p.id, "answered")}>
                          <CheckCircle className="size-4 mr-1" /> Respondida
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(p.id, "archived")}>
                          <Archive className="size-4 mr-1" /> Archivar
                        </Button>
                      </>
                    )}
                    {(p.status === "answered" || p.status === "archived") && (
                      <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(p.id, "active")}>
                        Mover a Activas
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
