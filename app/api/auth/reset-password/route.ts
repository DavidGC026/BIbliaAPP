import { readAuthBody, emailField, passwordField, RequestError, securityErrorResponse } from "@/lib/request-security"
import { limitAccountAccess } from "@/lib/auth-rate-limit"
import { type NextRequest, NextResponse } from "next/server"
import {
  getUserByPasswordResetToken,
  consumePasswordResetToken,
} from "@/lib/bible"
import { hashPassword } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const body = await readAuthBody(req)
    const password = passwordField(body.password)
    const { token } = body
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) throw new RequestError("Enlace inválido.")
    await limitAccountAccess(req, token, "reset", 5)

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
    if (!await consumePasswordResetToken(token, passwordHash)) {
      throw new RequestError("Enlace inválido, vencido o ya utilizado.")
    }

    return NextResponse.json({
      success: true,
      message: "Contraseña actualizada. Ya puedes iniciar sesión.",
    })
  } catch (err) {
    return securityErrorResponse(err)
  }
}
