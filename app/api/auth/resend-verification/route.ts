import { type NextRequest, NextResponse } from "next/server"
import { getUserByEmail, setUserEmailVerificationToken } from "@/lib/bible"
import { generateSecureToken } from "@/lib/auth"
import { sendVerificationEmail } from "@/lib/email"

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: "El correo electrónico es obligatorio." }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const user = await getUserByEmail(normalizedEmail)

    if (!user) {
      return NextResponse.json({
        success: true,
        message: "Si el correo está registrado, recibirás un nuevo enlace de verificación.",
      })
    }

    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: "Este correo ya está verificado. Puedes iniciar sesión.",
      })
    }

    const verificationToken = generateSecureToken()
    await setUserEmailVerificationToken(user.id, verificationToken)

    const origin = req.headers.get("origin") || undefined
    await sendVerificationEmail(user.email, user.name, verificationToken, origin)

    return NextResponse.json({
      success: true,
      message: "Te enviamos un nuevo enlace de verificación a tu correo.",
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al reenviar verificación" },
      { status: 500 },
    )
  }
}
