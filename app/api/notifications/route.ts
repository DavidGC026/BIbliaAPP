import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getNotifications } from "@/lib/bible"

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const onlyUnread = req.nextUrl.searchParams.get("unread") !== null
    const data = await getNotifications(session.userId, onlyUnread)
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al obtener notificaciones" },
      { status: 500 },
    )
  }
}
