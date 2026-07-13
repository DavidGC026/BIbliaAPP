import { NextRequest, NextResponse } from "next/server"
import {
  getUserByEmailVerificationToken,
  markUserEmailVerified,
} from "@/lib/bible"

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token")

    if (!token) {
      return NextResponse.json({ error: "Token de verificación requerido." }, { status: 400 })
    }

    const user = await getUserByEmailVerificationToken(token)
    if (!user) {
      return NextResponse.json(
        { error: "Enlace de verificación inválido o ya utilizado." },
        { status: 400 },
      )
    }

    if (user.emailVerified) {
      return NextResponse.json({ success: true, message: "Tu correo ya estaba verificado." })
    }

    const expires = user.emailVerificationExpires
      ? new Date(user.emailVerificationExpires)
      : null
    if (expires && expires.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "El enlace de verificación ha expirado. Solicita uno nuevo." },
        { status: 400 },
      )
    }

    await markUserEmailVerified(user.id)

    return NextResponse.json({
      success: true,
      message: "¡Correo verificado! Ya puedes iniciar sesión.",
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al verificar correo" },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()
    if (!token) {
      return NextResponse.json({ error: "Token de verificación requerido." }, { status: 400 })
    }

    const verifyUrl = new URL("/api/auth/verify-email", req.url)
    verifyUrl.searchParams.set("token", token)
    const internalReq = new NextRequest(verifyUrl)
    return GET(internalReq)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al verificar correo" },
      { status: 500 },
    )
  }
}
