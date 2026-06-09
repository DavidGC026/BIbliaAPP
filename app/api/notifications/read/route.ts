import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { markNotificationsRead } from "@/lib/bible"

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await req.json()
    if (body.all === true) {
      await markNotificationsRead(session.userId, "all")
    } else if (Array.isArray(body.ids)) {
      const ids = body.ids.filter((id: unknown): id is number => typeof id === "number")
      await markNotificationsRead(session.userId, ids)
    } else {
      return NextResponse.json({ error: "Se requiere 'ids' o 'all'" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al marcar notificaciones" },
      { status: 500 },
    )
  }
}
