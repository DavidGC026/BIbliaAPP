"use client"

import * as React from "react"
import { useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { HeartHandshake, Plus, CheckCircle, Archive, Trash2, Loader2, Search } from "lucide-react"

interface Prayer {
  id: number
  title: string
  description: string
  status: "active" | "answered" | "archived"
  created_at: string
}

export function PrayerRequests() {
  const { data, mutate, isLoading } = useSWR<{ prayers: Prayer[] }>("/api/prayers", fetcher)
  const prayers = data?.prayers ?? []

  const [filter, setFilter] = useState<"active" | "answered" | "archived">("active")
  const [isCreating, setIsCreating] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)

  const filteredPrayers = prayers.filter(p => p.status === filter)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    setSaving(true)
    try {
      const res = await fetch("/api/prayers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      })
      if (!res.ok) throw new Error("Error al crear")
      await mutate()
      setIsCreating(false)
      setTitle("")
      setDescription("")
      setFilter("active")
    } catch (err) {
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
    } catch (err) {
      alert("Error al actualizar")
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar esta petición permanentemente?")) return
    try {
      await fetch(`/api/prayers?id=${id}`, { method: "DELETE" })
      await mutate()
    } catch (err) {
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
            Tus peticiones delante de Dios
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
                onChange={e => setTitle(e.target.value)} 
                placeholder="Ej: Por la salud de mi familia..." 
                required 
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Detalles adicionales</label>
              <Textarea 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="Escribe más detalles si lo deseas..." 
                className="min-h-[100px]"
              />
            </div>
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
          <div className="flex items-center gap-2 p-1 bg-muted/40 rounded-lg w-fit">
            <button 
              onClick={() => setFilter("active")}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-all flex items-center gap-2 ${filter === "active" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              🔥 Activas ({prayers.filter(p => p.status === "active").length})
            </button>
            <button 
              onClick={() => setFilter("answered")}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-all flex items-center gap-2 ${filter === "answered" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              ✨ Respondidas ({prayers.filter(p => p.status === "answered").length})
            </button>
            <button 
              onClick={() => setFilter("archived")}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-all flex items-center gap-2 ${filter === "archived" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              📦 Archivo ({prayers.filter(p => p.status === "archived").length})
            </button>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              <div className="py-12 flex justify-center"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
            ) : filteredPrayers.length === 0 ? (
              <div className="text-center py-16 bg-card/50 rounded-2xl border border-dashed border-border">
                <HeartHandshake className="size-12 mx-auto text-muted-foreground/30 mb-3" />
                <h3 className="font-bold text-lg">No tienes peticiones {filter === "active" ? "activas" : filter === "answered" ? "respondidas" : "archivadas"}</h3>
                <p className="text-muted-foreground text-sm">Agrega una petición y confía en que Dios escucha tu oración.</p>
              </div>
            ) : (
              filteredPrayers.map(p => (
                <div key={p.id} className="p-5 rounded-xl border border-border bg-card shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg">{p.title}</h3>
                    {p.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{p.description}</p>}
                    <p className="text-xs text-muted-foreground pt-2">Creada el {new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {p.status === "active" && (
                      <>
                        <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100" onClick={() => handleUpdateStatus(p.id, "answered")}>
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
