"use client"

import { useEffect, useRef, useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import {
  AVATAR_VISIBILITY_DESCRIPTIONS,
  AVATAR_VISIBILITY_LABELS,
  type AvatarVisibility,
} from "@/lib/avatar-visibility"
import { Button } from "@/components/ui/button"
import { Loader2, Lock, Upload } from "lucide-react"
import { UserAvatar } from "@/components/user-avatar"
import { cn } from "@/lib/utils"

const VISIBILITY_ORDER: AvatarVisibility[] = [
  "private",
  "friends",
  "church",
  "groups",
  "public",
]

export function PrivacySettings() {
  const { data, mutate, isLoading } = useSWR<{
    avatarUrl: string | null
    avatarVisibility: AvatarVisibility
    avatarMediaId: number | null
  }>("/api/profile", fetcher)

  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [visibility, setVisibility] = useState<AvatarVisibility>("groups")
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (data?.avatarVisibility) setVisibility(data.avatarVisibility)
  }, [data?.avatarVisibility])

  async function uploadAvatar(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("purpose", "avatar")
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error)

      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatarMediaId: body.mediaId,
          avatarVisibility: visibility,
        }),
      })
      await mutate()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al subir foto")
    } finally {
      setUploading(false)
    }
  }

  async function saveVisibility(vis: AvatarVisibility) {
    setSaving(true)
    setVisibility(vis)
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatarVisibility: vis,
          avatarMediaId: data?.avatarMediaId,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      await mutate()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Lock className="size-5 text-primary" />
        <h3 className="font-bold">Privacidad de foto de perfil</h3>
      </div>

      <div className="flex items-center gap-4">
        <UserAvatar name="Yo" avatarUrl={data?.avatarUrl} size="lg" />
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) uploadAvatar(f)
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="gap-1.5"
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Cambiar foto
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold">Quién puede ver tu foto</p>
        {VISIBILITY_ORDER.map((vis) => (
          <button
            key={vis}
            type="button"
            onClick={() => saveVisibility(vis)}
            disabled={saving}
            className={cn(
              "w-full text-left rounded-lg border p-3 transition-colors",
              visibility === vis
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/30",
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "size-4 rounded-full border-2 flex items-center justify-center",
                  visibility === vis ? "border-primary" : "border-muted-foreground/40",
                )}
              >
                {visibility === vis && <div className="size-2 rounded-full bg-primary" />}
              </div>
              <span className="font-medium text-sm">{AVATAR_VISIBILITY_LABELS[vis]}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 ml-6">
              {AVATAR_VISIBILITY_DESCRIPTIONS[vis]}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
