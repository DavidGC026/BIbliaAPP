import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { resolveReport } from "@/lib/moderation"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(req)
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { error: "Acceso denegado. Se requieren permisos de administrador." },
        { status: 403 },
      )
    }

    const { id } = await params
    const reportId = parseInt(id, 10)
    if (isNaN(reportId) || reportId <= 0) {
      return NextResponse.json({ error: "ID de reporte inválido." }, { status: 400 })
    }

    const body = await req.json()
    const { action, notes } = body

    if (!["dismiss", "delete_content", "suspend_user"].includes(action)) {
      return NextResponse.json({ error: "Acción de resolución inválida." }, { status: 400 })
    }

    await resolveReport(session.userId, reportId, action, notes)

    return NextResponse.json({
      success: true,
      message: "Reporte resuelto correctamente.",
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al resolver el reporte." },
      { status: 500 },
    )
  }
}
