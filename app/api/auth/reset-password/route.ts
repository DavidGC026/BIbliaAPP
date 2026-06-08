import { type NextRequest, NextResponse } from "next/server"
import {
  getUserByPasswordResetToken,
  updateUserPassword,
  clearUserPasswordResetToken,
} from "@/lib/bible"
import { hashPassword } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token y nueva contraseña son obligatorios." },
        { status: 400 },
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres." },
        { status: 400 },
      )
    }

    const user = await getUserByPasswordResetToken(token)
    if (!user) {
      return NextResponse.json(
        { error: "Enlace inválido o ya utilizado." },
        { status: 400 },
      )
    }

    const expires = user.passwordResetExpires ? new Date(user.passwordResetExpires) : null
    if (expires && expires.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "El enlace ha expirado. Solicita uno nuevo." },
        { status: 400 },
      )
    }

    const passwordHash = hashPassword(password)
    await updateUserPassword(user.id, passwordHash)
    await clearUserPasswordResetToken(user.id)

    return NextResponse.json({
      success: true,
      message: "Contraseña actualizada. Ya puedes iniciar sesión.",
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al restablecer contraseña" },
      { status: 500 },
    )
  }
}
