import { type NextRequest, NextResponse } from "next/server"
import { deleteUser, updateUserAdmin } from "@/lib/bible"
import { getSession, hashPassword } from "@/lib/auth"
import { sanitizeReaderSections } from "@/lib/app-sections"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    if (session.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado. Se requieren permisos de administrador." }, { status: 403 })
    }

    const { id } = await params
    const idNum = Number(id)
    if (isNaN(idNum)) {
      return NextResponse.json({ error: "ID de usuario inválido." }, { status: 400 })
    }

    const { name, email, password, role, allowedSections } = await req.json()

    if (!name || !email || !role) {
      return NextResponse.json({ error: "Nombre, email y rol son requeridos." }, { status: 400 })
    }

    const passwordHash = password && password.trim().length > 0 ? hashPassword(password) : null
    const userRole = role === "admin" ? "admin" : "user"
    const sectionsArray = userRole === "admin"
      ? null
      : Array.isArray(allowedSections)
        ? sanitizeReaderSections(allowedSections)
        : null

    await updateUserAdmin(idNum, name.trim(), email.trim(), passwordHash, userRole, sectionsArray)

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al actualizar el usuario" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    if (session.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado. Se requieren permisos de administrador." }, { status: 403 })
    }

    const { id } = await params
    const idNum = Number(id)

    if (isNaN(idNum)) {
      return NextResponse.json({ error: "ID de usuario inválido." }, { status: 400 })
    }

    if (session.userId === idNum) {
      return NextResponse.json({ error: "No puedes eliminar tu propia cuenta de administrador." }, { status: 400 })
    }

    await deleteUser(idNum)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al eliminar usuario" },
      { status: 500 }
    )
  }
}
