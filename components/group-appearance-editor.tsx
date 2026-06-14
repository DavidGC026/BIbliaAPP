"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Upload, ImageIcon } from "lucide-react"
import { GroupVisual } from "@/components/group-visual"

interface GroupAppearanceEditorProps {
  groupId: number
  name: string
  coverImage: string | null
  avatarImage: string | null
  churchLogoUrl?: string | null
  isOfficialChurch?: boolean
  onSaved: () => void
  onCancel: () => void
}

export function GroupAppearanceEditor({
  groupId,
  name,
  coverImage,
  avatarImage,
  churchLogoUrl,
  isOfficialChurch,
  onSaved,
  onCancel,
}: GroupAppearanceEditorProps) {
  const [cover, setCover] = useState(coverImage)
  const [avatar, setAvatar] = useState(avatarImage)
  const [uploading, setUploading] = useState<"cover" | "avatar" | null>(null)
  const [saving, setSaving] = useState(false)
  const coverRef = useRef<HTMLInputElement>(null)
  const avatarRef = useRef<HTMLInputElement>(null)

  async function uploadFile(file: File, target: "cover" | "avatar") {
    setUploading(target)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("purpose", "group_cover")
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (target === "cover") setCover(data.url)
      else setAvatar(data.url)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al subir")
    } finally {
      setUploading(null)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_appearance",
          cover_image: cover,
          avatar_image: avatar,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      onSaved()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h3 className="font-bold">Editar apariencia del grupo</h3>
      <GroupVisual
        name={name}
        coverImage={cover}
        avatarImage={avatar}
        churchLogoUrl={churchLogoUrl}
        isOfficialChurch={isOfficialChurch}
        variant="hero"
      />
      <div className="flex flex-wrap gap-2 pt-8">
        <input
          ref={coverRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) uploadFile(f, "cover")
          }}
        />
        <input
          ref={avatarRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) uploadFile(f, "avatar")
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading === "cover"}
          onClick={() => coverRef.current?.click()}
          className="gap-1.5"
        >
          {uploading === "cover" ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
          Portada
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading === "avatar"}
          onClick={() => avatarRef.current?.click()}
          className="gap-1.5"
        >
          {uploading === "avatar" ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          Foto del grupo
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Recomendado: portada 16:9, foto del grupo cuadrada. Solo visible para miembros.
      </p>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : "Guardar"}
        </Button>
      </div>
    </div>
  )
}
