import { type NextRequest, NextResponse } from "next/server"
import {
  getUserByEmail,
  createUser,
  setUserEmailVerificationToken,
} from "@/lib/bible"
import { hashPassword, generateSecureToken } from "@/lib/auth"
import { sendVerificationEmail } from "@/lib/email"

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Todos los campos (nombre, correo, contraseña) son obligatorios." },
        { status: 400 },
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres." },
        { status: 400 },
      )
    }

    const normalizedEmail = email.trim().toLowerCase()
    const existingUser = await getUserByEmail(normalizedEmail)
    if (existingUser) {
      return NextResponse.json(
        { error: "El correo electrónico ya está registrado." },
        { status: 409 },
      )
    }

    const passwordHash = hashPassword(password)
    const userId = await createUser(name.trim(), normalizedEmail, passwordHash, "user")

    const verificationToken = generateSecureToken()
    await setUserEmailVerificationToken(userId, verificationToken)

    const origin = req.headers.get("origin") || undefined
    await sendVerificationEmail(normalizedEmail, name.trim(), verificationToken, origin)

    return NextResponse.json({
      success: true,
      needsVerification: true,
      message:
        "Cuenta creada. Revisa tu correo y haz clic en el enlace de verificación para activar tu cuenta.",
      email: normalizedEmail,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al registrar usuario" },
      { status: 500 },
    )
  }
}
