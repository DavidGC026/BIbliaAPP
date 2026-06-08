import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { updateAllReadersPermissions } from "@/lib/bible"
import { sanitizeReaderSections } from "@/lib/app-sections"

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    if (session.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado. Se requieren permisos de administrador." }, { status: 403 })
    }

    const { allowedSections } = await req.json()
    if (!Array.isArray(allowedSections)) {
      return NextResponse.json({ error: "Se requiere un arreglo de secciones permitidas." }, { status: 400 })
    }

    const sanitized = sanitizeReaderSections(allowedSections)
    const affectedRows = await updateAllReadersPermissions(sanitized)

    return NextResponse.json({ 
      success: true, 
      message: `Permisos actualizados globalmente para todos los usuarios lectores.`,
      affectedRows
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al aplicar permisos globales" },
      { status: 500 }
    )
  }
}
