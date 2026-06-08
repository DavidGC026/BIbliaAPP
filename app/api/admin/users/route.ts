import { type NextRequest, NextResponse } from "next/server"
import { listUsers, createUser, getUserByEmail } from "@/lib/bible"
import { getSession, hashPassword } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    if (session.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado. Se requieren permisos de administrador." }, { status: 403 })
    }

    const users = await listUsers()
    return NextResponse.json({ users })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al obtener usuarios" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    if (session.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado. Se requieren permisos de administrador." }, { status: 403 })
    }

    const { name, email, password, role, allowedSections } = await req.json()

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "Todos los campos (nombre, correo, contraseña, rol) son obligatorios." },
        { status: 400 }
      )
    }

    const existingUser = await getUserByEmail(email)
    if (existingUser) {
      return NextResponse.json(
        { error: "El correo electrónico ya está registrado." },
        { status: 409 }
      )
    }

    const passwordHash = hashPassword(password)
    const userRole = role === "admin" ? "admin" : "user"
    const sectionsArray = Array.isArray(allowedSections) ? allowedSections : null
    
    const userId = await createUser(name.trim(), email.trim(), passwordHash, userRole, sectionsArray)

    return NextResponse.json({
      success: true,
      user: { id: userId, name: name.trim(), email: email.trim(), role: userRole }
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al crear usuario" },
      { status: 500 }
    )
  }
}
