"use client"

import { useEffect, useRef, useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Church, Upload } from "lucide-react"

export function ChurchSettingsPanel() {
  const { data, mutate, isLoading } = useSWR<{
    settings: {
      church_name: string
      church_logo_url: string | null
      official_group_id: number | null
    }
    groups?: { id: number; name: string; is_official_church: number }[]
  }>("/api/church-settings", fetcher)

  const [churchName, setChurchName] = useState("BibliaAPP")
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [officialGroupId, setOfficialGroupId] = useState("")
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (data?.settings && !initialized.current) {
      setChurchName(data.settings.church_name)
      setLogoUrl(data.settings.church_logo_url)
      setOfficialGroupId(
        data.settings.official_group_id ? String(data.settings.official_group_id) : "",
      )
      initialized.current = true
    }
  }, [data])

  const groups = data?.groups ?? []

  async function uploadLogo(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error)
      setLogoUrl(body.url)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al subir logo")
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/church-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          church_name: churchName.trim() || "BibliaAPP",
          church_logo_url: logoUrl,
          official_group_id: officialGroupId ? parseInt(officialGroupId, 10) : null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      initialized.current = false
      await mutate()
      alert("Configuración de iglesia guardada")
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5 mb-6">
      <div className="flex items-center gap-2">
        <Church className="size-5 text-primary" />
        <h2 className="text-lg font-bold">Branding de la iglesia</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Logo y nombre de la congregación. El grupo oficial define quién cuenta como &quot;Iglesia&quot; en la privacidad de fotos.
      </p>
      <div className="flex items-center gap-4">
        <div className="size-16 rounded-xl border border-border bg-muted/30 overflow-hidden flex items-center justify-center shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="size-full object-contain p-1" />
          ) : (
            <Church className="size-8 text-muted-foreground/40" />
          )}
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) uploadLogo(f)
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
            Subir logo
          </Button>
        </div>
      </div>
      <div>
        <label className="text-sm font-semibold mb-1 block">Nombre de la iglesia</label>
        <Input value={churchName} onChange={(e) => setChurchName(e.target.value)} placeholder="Ej: Iglesia Central" />
      </div>
      <div>
        <label className="text-sm font-semibold mb-1 block">Grupo oficial (congregación)</label>
        <select
          value={officialGroupId}
          onChange={(e) => setOfficialGroupId(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Ninguno</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>
      <Button onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : "Guardar configuración"}
      </Button>
    </div>
  )
}
