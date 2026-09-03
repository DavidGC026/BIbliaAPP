import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import * as api from "@/lib/api";
import type { ReportItem } from "@/lib/types";

const REASON_LABELS: Record<string, string> = {
  spam: "Spam o publicidad",
  harassment: "Acoso o intimidación",
  hate_speech: "Discurso de odio",
  inappropriate: "Contenido inapropiado",
  violence: "Violencia o amenazas",
  false_information: "Información falsa",
  other: "Otro motivo",
};

export function AdminModerationPanel() {
  const [statusFilter, setStatusFilter] = useState<
    "pending" | "resolved" | "dismissed" | "all"
  >("pending");
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminModerationReports(statusFilter);
      setReports(data.reports || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar reportes.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [statusFilter]);

  const handleResolve = async (
    reportId: number,
    action: "dismiss" | "delete_content",
    notes?: string,
  ) => {
    setActionLoadingId(reportId);
    try {
      await api.resolveAdminModerationReport(reportId, action, notes);
      await loadReports();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Error al procesar acción",
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header and status filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600">
            <Icon name="alert" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Moderación de la comunidad
            </h2>
            <p className="text-xs text-muted-foreground">
              Revisión de contenido reportado por usuarios (posts, comentarios y perfiles).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/60 text-xs">
          {(["pending", "resolved", "dismissed", "all"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === st
                  ? "bg-card text-foreground shadow-sm font-bold"
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

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
          Cargando reportes de moderación…
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground space-y-3 rounded-2xl border border-dashed border-border/80 bg-card/50">
          <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            ✓
          </div>
          <p className="font-semibold text-foreground">Bandeja al día</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            No hay reportes {statusFilter !== "all" ? `con estado "${statusFilter}"` : ""} en este momento.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const isPending = report.status === "pending";
            return (
              <div
                key={report.id}
                className={`flex flex-col gap-4 rounded-2xl border p-5 transition-all bg-card shadow-sm ${
                  isPending
                    ? "border-amber-500/40 bg-amber-500/[0.02]"
                    : "border-border/80"
                }`}
              >
                {/* Top: Metadata */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-border/40 pb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isPending
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : report.status === "resolved"
                            ? "bg-rose-500/15 text-rose-600"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {report.status === "pending"
                        ? "Pendiente"
                        : report.status === "resolved"
                          ? "Contenido Eliminado"
                          : "Descartado"}
                    </span>

                    <span className="font-semibold capitalize text-foreground">
                      {report.target_type === "post"
                        ? "Publicación"
                        : report.target_type === "comment"
                          ? "Comentario"
                          : "Usuario"}
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">
                      ID #{report.target_id}
                    </span>
                  </div>

                  <span className="text-muted-foreground">
                    {new Date(report.created_at).toLocaleString("es", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>

                {/* Reason & Content */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-500">
                      Motivo:
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {REASON_LABELS[report.reason] || report.reason}
                    </span>
                  </div>

                  {report.details && (
                    <p className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-xl border border-border/40 italic">
                      «{report.details}»
                    </p>
                  )}

                  {/* Target Author & Preview Content */}
                  <div className="rounded-xl border border-border/70 bg-background/60 p-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-foreground">
                        Autor reportado:
                      </span>
                      <span>
                        {report.target_author_name || "Desconocido"}
                        {report.target_author_username
                          ? ` (@${report.target_author_username})`
                          : ""}
                      </span>
                    </div>

                    {report.target_content && (
                      <p className="text-xs text-foreground/90 font-mono line-clamp-3 bg-muted/20 p-2 rounded-lg">
                        {report.target_content}
                      </p>
                    )}
                  </div>

                  {/* Reporter info */}
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1">
                    <span>Denunciado por:</span>
                    <span className="font-medium text-foreground">
                      {report.reporter_name || "Usuario"}
                      {report.reporter_username
                        ? ` (@${report.reporter_username})`
                        : ""}
                    </span>
                  </div>
                </div>

                {/* Resolution Actions */}
                {isPending && (
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border/40">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResolve(report.id, "dismiss")}
                      loading={actionLoadingId === report.id}
                      className="text-xs"
                    >
                      Descartar reporte
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (
                          confirm(
                            "¿Confirmas que deseas eliminar este contenido reportado?",
                          )
                        ) {
                          handleResolve(report.id, "delete_content");
                        }
                      }}
                      loading={actionLoadingId === report.id}
                      className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                    >
                      Eliminar contenido
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
