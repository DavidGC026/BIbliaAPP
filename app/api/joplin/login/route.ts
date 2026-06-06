import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    const base = process.env.JOPLIN_API_URL

    if (!base) {
      return NextResponse.json(
        { error: "La variable de entorno JOPLIN_API_URL no está configurada." },
        { status: 500 }
      )
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: "El correo y la contraseña son obligatorios." },
        { status: 400 }
      )
    }

    const res = await fetch(`${base.replace(/\/$/, "")}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || "Credenciales incorrectas o error en Joplin Server." },
        { status: res.status }
      )
    }

    // Joplin Server returns { id: "SESSION_TOKEN", ... }
    return NextResponse.json({ token: data.id })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    )
  }
}
