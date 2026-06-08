import { type NextRequest, NextResponse } from "next/server"
import { getUserByEmail, createUser } from "@/lib/bible"
import { hashPassword, generateToken } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Todos los campos (nombre, correo, contraseña) son obligatorios." },
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
    // Default role is user, unless explicitly admin (only first admin is seeded)
    const userRole = role === "admin" ? "admin" : "user"
    const userId = await createUser(name.trim(), email.trim(), passwordHash, userRole)

    const token = generateToken({ userId, role: userRole })

    const response = NextResponse.json({
      success: true,
      user: { id: userId, name: name.trim(), email: email.trim(), role: userRole },
      token
    })

    // Set HTTP-only cookie
    response.headers.append(
      "Set-Cookie",
      `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
    )

    return response
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al registrar usuario" },
      { status: 500 }
    )
  }
}
