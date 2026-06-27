"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { fetcher } from "@/lib/fetcher"
import { ArrowRightLeft, CheckCircle2, Loader2, ShieldCheck } from "lucide-react"

type TransferCategory = "notebooks" | "devotionals" | "highlights" | "verseNotes" | "readingPlans"

const CATEGORY_LABELS: Record<TransferCategory, string> = {
  notebooks: "Libretas y notas",
  devotionals: "Diario espiritual",
  highlights: "Subrayados",
  verseNotes: "Notas por versículo",
  readingPlans: "Planes de lectura",
}

interface PreviewData {
  source: { id: number; email: string; name: string }
  counts: Record<TransferCategory, number>
  notebookNotes: number
}

export function AccountTransferPanel() {
  const [sourceEmail, setSourceEmail] = useState("")
  const [sourcePassword, setSourcePassword] = useState("")
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [selected, setSelected] = useState<TransferCategory[]>([
    "notebooks",
    "devotionals",
    "highlights",
    "verseNotes",
    "readingPlans",
  ])
  const [move, setMove] = useState(true)
  const [loading, setLoading] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const totalSelected = useMemo(
    () => selected.reduce((sum, key) => sum + (preview?.counts[key] ?? 0), 0),
    [preview, selected],
  )

  async function handleVerify() {
    setLoading(true)
    setError(null)
    setInfo(null)
    setSuccess(null)
    setPreview(null)
    try {
      const res = await fetch("/api/profile/transfer/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...fetcherHeaders() },
        body: JSON.stringify({
          sourceEmail: sourceEmail.trim().toLowerCase(),
          sourcePassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === "SAME_ACCOUNT") {
          setInfo(data.error)
          return
        }
        throw new Error(data.error || "No se pudo verificar la cuenta")
      }
      setPreview(data)
      setSelected(
        (Object.keys(CATEGORY_LABELS) as TransferCategory[]).filter((key) => data.counts[key] > 0),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al verificar")
    } finally {
      setLoading(false)
    }
  }

  async function handleTransfer() {
    if (!preview) return
    setTransferring(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch("/api/profile/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...fetcherHeaders() },
        body: JSON.stringify({
          sourceEmail: sourceEmail.trim().toLowerCase(),
          sourcePassword,
          move,
          categories: selected,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "No se pudo transferir")
      const parts = Object.entries(data.transferred || {})
        .filter(([, count]) => Number(count) > 0)
        .map(([key, count]) => `${CATEGORY_LABELS[key as TransferCategory]}: ${count}`)
      setSuccess(
        parts.length > 0
          ? `Transferencia completada (${move ? "movido" : "copiado"}): ${parts.join(" · ")}`
          : "Transferencia completada. No había contenido en las categorías seleccionadas.",
      )
      setPreview(null)
      setSourcePassword("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al transferir")
    } finally {
      setTransferring(false)
    }
  }

  function toggleCategory(key: TransferCategory) {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    )
  }

  return (
    <section className="rounded-xl border border-border/50 bg-card/40 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
          <ArrowRightLeft className="size-4" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-foreground">Importar de cuenta anterior</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Si usabas el mismo correo antes de Google, no hace falta transferir: cierra sesión e inicia con{" "}
            <strong>Continuar con Google</strong> y entrarás a la misma cuenta con tus datos.
            Solo usa esto si la cuenta anterior tenía <strong>otro correo</strong>.
          </p>
        </div>
      </div>

      {!preview ? (
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Correo de la cuenta anterior
            </label>
            <Input
              type="email"
              value={sourceEmail}
              onChange={(e) => setSourceEmail(e.target.value)}
              placeholder="cuenta.antigua@correo.com"
              className="mt-1 h-9"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Contraseña de esa cuenta
            </label>
            <Input
              type="password"
              value={sourcePassword}
              onChange={(e) => setSourcePassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 h-9"
              autoComplete="current-password"
            />
          </div>
          <Button
            type="button"
            onClick={handleVerify}
            disabled={loading || !sourceEmail.trim() || !sourcePassword}
            className="gap-2"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            Verificar que es mi cuenta
          </Button>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm">
            <p className="font-semibold text-emerald-700 dark:text-emerald-300">
              Cuenta verificada: {preview.source.name}
            </p>
            <p className="text-xs text-muted-foreground">{preview.source.email}</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Contenido disponible
            </p>
            {(Object.keys(CATEGORY_LABELS) as TransferCategory[]).map((key) => {
              const count = preview.counts[key]
              const extra =
                key === "notebooks" && preview.notebookNotes > 0
                  ? ` (${preview.notebookNotes} notas)`
                  : ""
              return (
                <label
                  key={key}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm cursor-pointer",
                    selected.includes(key) ? "border-primary/40 bg-primary/5" : "border-border/50",
                    count === 0 && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selected.includes(key)}
                      disabled={count === 0}
                      onChange={() => toggleCategory(key)}
                      className="rounded border-border"
                    />
                    {CATEGORY_LABELS[key]}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">
                    {count}
                    {extra}
                  </span>
                </label>
              )
            })}
          </div>

          <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={move}
              onChange={(e) => setMove(e.target.checked)}
              className="mt-0.5 rounded border-border"
            />
            <span>
              <strong className="text-foreground">Mover</strong> en lugar de copiar (quita el contenido
              de la cuenta anterior). Recomendado si ya no usarás esa cuenta.
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={handleTransfer}
              disabled={transferring || selected.length === 0 || totalSelected === 0}
              className="gap-2"
            >
              {transferring ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowRightLeft className="size-4" />
              )}
              Transferir a mi cuenta
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPreview(null)
                setError(null)
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {error ? (
        <p className="text-sm text-destructive rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
          {error}
        </p>
      ) : null}

      {info ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-300 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
          {info}
        </p>
      ) : null}

      {success ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-300 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 flex items-start gap-2">
          <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
          {success}
        </p>
      ) : null}
    </section>
  )
}

function fetcherHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const token = localStorage.getItem("biblia_token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}
