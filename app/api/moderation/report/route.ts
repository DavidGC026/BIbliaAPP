import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { createReport, type ReportReason, type ReportTargetType } from "@/lib/moderation"

const VALID_TYPES = new Set<ReportTargetType>(["post", "comment", "user"])
const VALID_REASONS = new Set<ReportReason>([
  "spam",
  "harassment",
  "hate_speech",
  "inappropriate",
  "violence",
  "false_information",
  "other",
])

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await req.json()
    const { targetType, targetId, reason, details } = body

    if (!VALID_TYPES.has(targetType)) {
      return NextResponse.json({ error: "Tipo de contenido a reportar inválido." }, { status: 400 })
    }

    const targetIdNum = parseInt(targetId, 10)
    if (isNaN(targetIdNum) || targetIdNum <= 0) {
      return NextResponse.json({ error: "ID de contenido inválido." }, { status: 400 })
    }

    if (!VALID_REASONS.has(reason)) {
      return NextResponse.json({ error: "Motivo de denuncia inválido." }, { status: 400 })
    }

    const reportId = await createReport(
      session.userId,
      targetType,
      targetIdNum,
      reason,
      details ? String(details).slice(0, 1000) : null,
    )

    return NextResponse.json({
      success: true,
      reportId,
      message: "Gracias por tu reporte. Nuestro equipo de moderación lo revisará a la brevedad.",
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al enviar el reporte." },
      { status: 500 },
    )
  }
}
