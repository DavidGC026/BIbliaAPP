import { type NextRequest, NextResponse } from "next/server"
import { getUserByEmail } from "@/lib/bible"
import { hashPassword, generateToken } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "El correo electrónico y la contraseña son obligatorios." },
        { status: 400 }
      )
    }

    const user = await getUserByEmail(email)
    if (!user) {
      return NextResponse.json(
        { error: "Credenciales incorrectas." },
        { status: 401 }
      )
    }

    const passwordHash = hashPassword(password)
    if (user.password !== passwordHash) {
      return NextResponse.json(
        { error: "Credenciales incorrectas." },
        { status: 401 }
      )
    }

    const token = generateToken({ userId: user.id, role: user.role })

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
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
      { error: err instanceof Error ? err.message : "Error al iniciar sesión" },
      { status: 500 }
    )
  }
}
