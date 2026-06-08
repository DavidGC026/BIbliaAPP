"use client"

import * as React from "react"
import { useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Users, Plus, Loader2, MessageSquareText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface Group {
  id: number
  name: string
  description: string
  role: string
  created_at: string
}

export function Groups() {
  const { data, mutate, isLoading } = useSWR<{ groups: Group[] }>("/api/groups", fetcher)
  const groups = data?.groups ?? []

  const [isCreating, setIsCreating] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      })
      if (!res.ok) throw new Error("Error al crear grupo")
      await mutate()
      setIsCreating(false)
      setName("")
      setDescription("")
    } catch (err) {
      alert("Error al crear el grupo")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-1 md:p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            Grupos <Users className="size-7 text-blue-500" />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Estudia y comparte con otros
          </p>
        </div>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white border-0">
            <Plus className="size-4" />
            <span>Nuevo Grupo</span>
          </Button>
        )}
      </div>

      {isCreating ? (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Crear Grupo de Estudio</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-1 block">Nombre del Grupo</label>
              <Input 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="Ej: Jóvenes en Acción" 
                required 
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Descripción</label>
              <Textarea 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="¿De qué trata este grupo?" 
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : "Crear Grupo"}
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          {isLoading ? (
            <div className="py-12 flex justify-center"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
          ) : groups.length === 0 ? (
            <div className="text-center py-16 bg-card/50 rounded-2xl border border-dashed border-border">
              <Users className="size-12 mx-auto text-muted-foreground/30 mb-3" />
              <h3 className="font-bold text-lg">No perteneces a ningún grupo</h3>
              <p className="text-muted-foreground text-sm">Crea un grupo para empezar a compartir devocionales y lecturas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groups.map(g => (
                <div key={g.id} className="p-5 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg group-hover:text-blue-500 transition-colors">{g.name}</h3>
                    <span className="text-xs font-semibold bg-muted px-2 py-1 rounded-md uppercase tracking-wider">{g.role}</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{g.description || "Sin descripción"}</p>
                  <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-xs text-muted-foreground font-medium">
                    <span>Creado el {new Date(g.created_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><MessageSquareText className="size-4" /> Entrar</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
