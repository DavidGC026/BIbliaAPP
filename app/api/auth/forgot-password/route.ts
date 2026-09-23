import { readAuthBody, emailField, passwordField, RequestError, securityErrorResponse } from "@/lib/request-security"
import { limitAccountAccess } from "@/lib/auth-rate-limit"
import { type NextRequest, NextResponse } from "next/server"
import { getUserByEmail, setUserPasswordResetToken } from "@/lib/bible"
import { generateSecureToken } from "@/lib/auth"
import { sendPasswordResetEmail } from "@/lib/email"

const GENERIC_MESSAGE =
  "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña."

export async function POST(req: NextRequest) {
  try {
    const body = await readAuthBody(req)
    const email = emailField(body.email)
    await limitAccountAccess(req, email, "forgot-password", 3)

    if (!email) {
      return NextResponse.json({ error: "El correo electrónico es obligatorio." }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const user = await getUserByEmail(normalizedEmail)

    if (user) {
      const resetToken = generateSecureToken()
      await setUserPasswordResetToken(user.id, resetToken, 1)
      const origin = req.headers.get("origin") || undefined
      await sendPasswordResetEmail(user.email, user.name, resetToken, origin)
    }

    return NextResponse.json({ success: true, message: GENERIC_MESSAGE })
  } catch (err) {
    return securityErrorResponse(err)
  }
}
