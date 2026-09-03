import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { listReports, type ReportStatus } from "@/lib/moderation"

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { error: "Acceso denegado. Se requieren permisos de administrador." },
        { status: 403 },
      )
    }

    const { searchParams } = new URL(req.url)
    const status = (searchParams.get("status") || "pending") as ReportStatus | "all"
    const limit = parseInt(searchParams.get("limit") || "50", 10)
    const offset = parseInt(searchParams.get("offset") || "0", 10)

    const reports = await listReports(status, limit, offset)
    return NextResponse.json({ reports })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al obtener denuncias." },
      { status: 500 },
    )
  }
}
