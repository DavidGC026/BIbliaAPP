import { type NextRequest, NextResponse } from "next/server"
import { getUserByEmail, updateUserPassword } from "@/lib/bible"
import { hashPassword, verifyPassword, needsRehash, generateToken, sessionCookieFlags } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "El correo electrónico y la contraseña son obligatorios." },
        { status: 400 },
      )
    }

    const normalizedEmail = email.trim().toLowerCase()
    const user = await getUserByEmail(normalizedEmail)
    if (!user) {
      return NextResponse.json(
        { error: "Credenciales incorrectas." },
        { status: 401 },
      )
    }

    if (!verifyPassword(password, user.password)) {
      return NextResponse.json(
        { error: "Credenciales incorrectas." },
        { status: 401 },
      )
    }

    // Migrar hashes con formato antiguo al nuevo formato scrypt
    if (needsRehash(user.password)) {
      try {
        await updateUserPassword(user.id, hashPassword(password))
      } catch {
        // No bloquear el login si falla la migración del hash
      }
    }

    if (!user.emailVerified && user.role !== "admin") {
      return NextResponse.json(
        {
          error: "Debes verificar tu correo antes de iniciar sesión.",
          code: "EMAIL_NOT_VERIFIED",
          email: user.email,
        },
        { status: 403 },
      )
    }

    const token = generateToken({ userId: user.id, role: user.role })

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt ?? null,
        legalAcceptedAt: user.legalAcceptedAt ?? null,
      },
      token,
    })

    response.headers.append(
      "Set-Cookie",
      `session=${token}; ${sessionCookieFlags()}; Max-Age=${7 * 24 * 60 * 60}`,
    )

    return response
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al iniciar sesión" },
      { status: 500 },
    )
  }
}
