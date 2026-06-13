"use client"

import * as React from "react"
import { useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import {
  Users,
  Plus,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { getGroupRoleLabel, isGroupAdmin } from "@/lib/group-roles"
import { GroupDetail } from "@/components/group-detail"
import { GroupVisual } from "@/components/group-visual"

interface Group {
  id: number
  name: string
  description: string
  role: string
  invite_code: string
  member_count: number
  created_at: string
  cover_image?: string | null
  avatar_image?: string | null
  is_official_church?: number
}

interface GroupsProps {
  currentUserId: number
  initialGroupId?: number | null
  onClearInitialGroupId?: () => void
}

export function Groups({ currentUserId, initialGroupId, onClearInitialGroupId }: GroupsProps) {
  const { data, mutate, isLoading } = useSWR<{ groups: Group[] }>("/api/groups", fetcher)
  const { data: churchData } = useSWR<{ settings: { church_logo_url: string | null } }>(
    "/api/church-settings",
    fetcher,
  )
  const groups = data?.groups ?? []
  const churchLogo = churchData?.settings?.church_logo_url

  const [isCreating, setIsCreating] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(initialGroupId ?? null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  React.useEffect(() => {
    if (initialGroupId != null) {
      setSelectedGroupId(initialGroupId)
      onClearInitialGroupId?.()
    }
  }, [initialGroupId, onClearInitialGroupId])

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null

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
      const created = await res.json()
      await mutate()
      setIsCreating(false)
      setName("")
      setDescription("")
      setSelectedGroupId(created.id)
    } catch {
      alert("Error al crear el grupo")
    } finally {
      setSaving(false)
    }
  }

  async function handleRegenerateCode() {
    if (!selectedGroup || !isGroupAdmin(selectedGroup.role)) return
    if (!confirm("¿Regenerar el código? El enlace y QR anteriores dejarán de funcionar.")) return

    setRegenerating(true)
    try {
      const res = await fetch(`/api/groups/${selectedGroup.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenerate_invite" }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || "Error al regenerar")
      await mutate()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al regenerar código")
    } finally {
      setRegenerating(false)
    }
  }

  if (selectedGroup) {
    return (
      <GroupDetail
        group={selectedGroup}
        currentUserId={currentUserId}
        churchLogoUrl={churchLogo}
        onBack={() => setSelectedGroupId(null)}
        onRegenerateCode={handleRegenerateCode}
        onRoleChanged={() => mutate()}
        onAppearanceChanged={() => mutate()}
        regenerating={regenerating}
      />
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fade-in px-1 md:px-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            Grupos <Users className="size-7 text-blue-500" />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Células, ministerios y grupos de estudio bíblico
          </p>
        </div>
        {!isCreating && (
          <Button
            onClick={() => setIsCreating(true)}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white border-0"
          >
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
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Jóvenes en Acción"
                required
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Descripción</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="¿De qué trata este grupo?"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : "Crear Grupo"}
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-16 bg-card/50 rounded-2xl border border-dashed border-border">
              <Users className="size-12 mx-auto text-muted-foreground/30 mb-3" />
              <h3 className="font-bold text-lg">No perteneces a ningún grupo</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Crea un grupo para tu célula o iglesia, o únete escaneando el código QR de invitación.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGroupId(g.id)}
                  className={cn(
                    "rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-all text-left overflow-hidden",
                    "hover:border-blue-500/30 group cursor-pointer",
                  )}
                >
                  <GroupVisual
                    name={g.name}
                    coverImage={g.cover_image}
                    avatarImage={g.avatar_image}
                    churchLogoUrl={churchLogo}
                    isOfficialChurch={!!g.is_official_church}
                    variant="card"
                  />
                  <div className="px-4 pb-4 pt-10">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-lg group-hover:text-blue-500 transition-colors">
                        {g.name}
                      </h3>
                      <span className="text-xs font-semibold bg-muted px-2 py-1 rounded-md tracking-wider shrink-0 ml-2">
                        {getGroupRoleLabel(g.role)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {g.description || "Sin descripción"}
                    </p>
                    <div className="mt-3 pt-3 border-t border-border flex justify-between items-center text-xs text-muted-foreground font-medium">
                      <span className="flex items-center gap-1">
                        <Users className="size-3.5" />
                        {g.member_count} {g.member_count === 1 ? "miembro" : "miembros"}
                      </span>
                      <span>Abrir grupo →</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
