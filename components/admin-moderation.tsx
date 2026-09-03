"use client"

import { useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Button } from "@/components/ui/button"
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Loader2,
  ShieldAlert,
  Trash2,
  XCircle,
} from "lucide-react"

interface ReportItem {
  id: number
  reporter_id: number
  reporter_name?: string
  reporter_username?: string
  target_type: "post" | "comment" | "user"
  target_id: number
  reason: string
  details: string | null
  status: "pending" | "resolved" | "dismissed"
  action_taken: string | null
  resolved_at: string | null
  created_at: string
  target_content?: string | null
  target_author_id?: number | null
  target_author_name?: string | null
  target_author_username?: string | null
}

const REASON_LABELS: Record<string, string> = {
  spam: "Spam o publicidad",
  harassment: "Acoso o intimidación",
  hate_speech: "Discurso de odio",
  inappropriate: "Contenido inapropiado",
  violence: "Violencia o amenazas",
  false_information: "Información falsa",
  other: "Otro motivo",
}

export function AdminModerationPanel() {
  const [statusFilter, setStatusFilter] = useState<"pending" | "resolved" | "dismissed" | "all">(
    "pending",
  )
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)

  const { data, mutate, isLoading } = useSWR<{ reports: ReportItem[] }>(
    `/api/admin/moderation?status=${statusFilter}`,
    fetcher,
  )

  const handleResolve = async (
    reportId: number,
    action: "dismiss" | "delete_content",
    notes?: string,
  ) => {
    setActionLoadingId(reportId)
    try {
      const res = await fetch(`/api/admin/moderation/${reportId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Error al resolver reporte")
      await mutate()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al procesar acción")
    } finally {
      setActionLoadingId(null)
    }
  }

  const reports = data?.reports || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600">
            <ShieldAlert className="size-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Moderación de la comunidad</h2>
            <p className="text-xs text-muted-foreground">
              Revisión de contenido reportado por los usuarios (posts, comentarios y perfiles).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-xl border border-border/60 text-xs">
          {(["pending", "resolved", "dismissed", "all"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                statusFilter === st
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {st === "pending"
                ? "Pendientes"
                : st === "resolved"
                  ? "Resueltos"
                  : st === "dismissed"
                    ? "Descartados"
                    : "Todos"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-border/40 bg-card/40 space-y-2">
          <CheckCircle2 className="size-10 text-emerald-500 mx-auto" />
          <h3 className="font-bold text-base text-foreground">Todo al día</h3>
          <p className="text-sm text-muted-foreground">
            No hay reportes {statusFilter !== "all" ? `con estado '${statusFilter}'` : ""} pendientes de revisión.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="rounded-xl border border-border/60 bg-card p-5 shadow-xs space-y-3 hover:border-border transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                      report.status === "pending"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : report.status === "resolved"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {report.status}
                  </span>
                  <span className="font-semibold text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                    Tipo: {report.target_type}
                  </span>
                  <span className="font-semibold text-xs text-rose-600 dark:text-rose-400">
                    Motivo: {REASON_LABELS[report.reason] || report.reason}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(report.created_at).toLocaleString()}
                </span>
              </div>

              {/* Contenido reportado */}
              <div className="p-3.5 rounded-lg bg-background/80 border border-border/60 space-y-1.5 text-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Autor del contenido: <strong>{report.target_author_name || "Desconocido"}</strong>
                    {report.target_author_username && ` (@${report.target_author_username})`}
                  </span>
                  <span>ID: {report.target_id}</span>
                </div>
                {report.target_content && (
                  <p className="text-foreground whitespace-pre-wrap leading-relaxed font-sans text-xs italic bg-muted/20 p-2 rounded">
                    "{report.target_content}"
                  </p>
                )}
                {report.details && (
                  <p className="text-xs text-muted-foreground pt-1 border-t border-border/30">
                    <strong>Nota del denunciante:</strong> {report.details}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-4 pt-1">
                <span className="text-xs text-muted-foreground">
                  Denunciado por: <strong>{report.reporter_name}</strong> (@{report.reporter_username})
                </span>

                {report.status === "pending" && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={actionLoadingId === report.id}
                      onClick={() => handleResolve(report.id, "dismiss")}
                      className="text-xs h-8"
                    >
                      <XCircle className="size-3.5 mr-1" />
                      Descartar
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={actionLoadingId === report.id}
                      onClick={() => handleResolve(report.id, "delete_content", "Eliminado por moderación")}
                      className="text-xs h-8"
                    >
                      <Trash2 className="size-3.5 mr-1" />
                      Eliminar contenido
                    </Button>
                  </div>
                )}

                {report.action_taken && (
                  <span className="text-xs text-muted-foreground italic">
                    Acción: {report.action_taken}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
