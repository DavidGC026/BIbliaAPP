"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react"

export type ReportTargetType = "post" | "comment" | "user"

export interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  targetType: ReportTargetType
  targetId: number
  targetLabel?: string
}

const REPORT_REASONS = [
  { value: "spam", label: "Spam o publicidad no deseada" },
  { value: "harassment", label: "Acoso o intimidación" },
  { value: "hate_speech", label: "Discurso de odio o discriminación" },
  { value: "inappropriate", label: "Contenido ofensivo o inapropiado" },
  { value: "violence", label: "Violencia o incitación al odio" },
  { value: "false_information", label: "Información falsa o engañosa" },
  { value: "other", label: "Otro motivo" },
]

export function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetLabel,
}: ReportModalProps) {
  const [reason, setReason] = useState<string>("spam")
  const [details, setDetails] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleClose = () => {
    setReason("spam")
    setDetails("")
    setSubmitted(false)
    setError(null)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/moderation/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId,
          reason,
          details: details.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al enviar la denuncia.")

      setSubmitted(true)
      setTimeout(() => {
        handleClose()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar reporte.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const targetName =
    targetType === "post"
      ? "publicación"
      : targetType === "comment"
        ? "comentario"
        : "usuario"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          aria-label="Cerrar"
        >
          <X className="size-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-rose-500/10 text-rose-600">
            <AlertTriangle className="size-5" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-foreground">Denunciar {targetName}</h2>
            {targetLabel && (
              <p className="text-xs text-muted-foreground line-clamp-1">{targetLabel}</p>
            )}
          </div>
        </div>

        {submitted ? (
          <div className="py-6 text-center space-y-2">
            <CheckCircle2 className="size-12 text-emerald-500 mx-auto animate-bounce" />
            <h3 className="font-bold text-base text-foreground">Reporte enviado</h3>
            <p className="text-sm text-muted-foreground">
              Gracias por ayudarnos a mantener segura la comunidad. Revisaremos este reporte.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                ¿Por qué deseas denunciar este contenido?
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {REPORT_REASONS.map((r) => (
                  <label
                    key={r.value}
                    className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-sm cursor-pointer transition-colors ${
                      reason === r.value
                        ? "border-primary bg-primary/5 font-medium"
                        : "border-border/60 hover:bg-muted/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={(e) => setReason(e.target.value)}
                      className="text-primary accent-primary"
                    />
                    <span>{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Detalles adicionales (opcional)
              </label>
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Explica brevemente lo ocurrido..."
                rows={2}
                className="text-sm bg-background border-border"
                maxLength={500}
              />
            </div>

            {error && (
              <p className="text-xs text-rose-500 bg-rose-500/10 p-2.5 rounded-lg font-medium">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={isSubmitting}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-1.5" />
                    Enviando...
                  </>
                ) : (
                  "Enviar denuncia"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
