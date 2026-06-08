import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getPublicProfile } from "@/lib/bible"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { username } = await params
    if (!username) {
      return NextResponse.json({ error: "Username requerido" }, { status: 400 })
    }

    const profile = await getPublicProfile(username, session.userId)
    if (!profile) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 })
    }

    // Omitir datos sensibles
    const { password, email, ...publicData } = profile

    return NextResponse.json({ profile: publicData })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al obtener el perfil" },
      { status: 500 }
    )
  }
}
