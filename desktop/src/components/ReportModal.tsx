import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import * as api from "@/lib/api";
import type { ReportTargetType } from "@/lib/types";

export interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: number;
  targetLabel?: string;
}

const REPORT_REASONS = [
  { value: "spam", label: "Spam o publicidad no deseada" },
  { value: "harassment", label: "Acoso o intimidación" },
  { value: "hate_speech", label: "Discurso de odio o discriminación" },
  { value: "inappropriate", label: "Contenido ofensivo o inapropiado" },
  { value: "violence", label: "Violencia o incitación al odio" },
  { value: "false_information", label: "Información falsa o engañosa" },
  { value: "other", label: "Otro motivo" },
];

export function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetLabel,
}: ReportModalProps) {
  const [reason, setReason] = useState<string>("spam");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setReason("spam");
    setDetails("");
    setSubmitted(false);
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await api.reportContent({
        targetType,
        targetId,
        reason,
        details: details.trim() || undefined,
      });

      setSubmitted(true);
      setTimeout(() => {
        handleClose();
      }, 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar reporte.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const targetName =
    targetType === "post"
      ? "publicación"
      : targetType === "comment"
        ? "comentario"
        : "usuario";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          aria-label="Cerrar"
        >
          <Icon name="close" size={16} />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
            <Icon name="alert" size={20} />
          </div>
          <div>
            <h2 className="font-bold text-lg text-foreground">
              Reportar {targetName}
            </h2>
            {targetLabel && (
              <p className="text-xs text-muted-foreground truncate max-w-[280px]">
                {targetLabel}
              </p>
            )}
          </div>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="flex size-12 mx-auto items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <span className="text-xl">✓</span>
            </div>
            <p className="font-semibold text-foreground">
              Reporte enviado con éxito
            </p>
            <p className="text-xs text-muted-foreground">
              Revisaremos el caso para mantener la comunidad segura y edificante.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tu reporte es completamente anónimo. Selecciona el motivo que
              mejor describe el problema con este contenido:
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Motivo de la denuncia
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-border bg-background p-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Detalles adicionales (opcional)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Añade más contexto si es necesario…"
                rows={3}
                className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {error && (
              <p className="text-xs font-medium text-destructive">{error}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={isSubmitting}>
                Enviar reporte
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
