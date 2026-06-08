import { type NextRequest, NextResponse } from "next/server"
import { getUserByEmail, setUserPasswordResetToken } from "@/lib/bible"
import { generateSecureToken } from "@/lib/auth"
import { sendPasswordResetEmail } from "@/lib/email"

const GENERIC_MESSAGE =
  "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña."

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

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
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al procesar la solicitud" },
      { status: 500 },
    )
  }
}
