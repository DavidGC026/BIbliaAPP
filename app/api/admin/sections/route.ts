import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { APP_SECTION_GROUPS, DEFAULT_READER_SECTIONS } from "@/lib/app-sections"

/**
 * Catálogo de secciones asignables a lectores, para el editor de
 * permisos del panel de administración (web y móvil).
 */
export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    if (session.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado. Se requieren permisos de administrador." }, { status: 403 })
    }

    const groups = APP_SECTION_GROUPS.map((group) => ({
      id: group.id,
      label: group.label,
      sections: group.sections
        .filter((s) => !s.adminOnly)
        .map((s) => ({ id: s.id, label: s.label })),
    })).filter((group) => group.sections.length > 0)

    return NextResponse.json({ groups, defaults: DEFAULT_READER_SECTIONS })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al obtener secciones" },
      { status: 500 }
    )
  }
}
