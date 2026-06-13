import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import {
  listFriends,
  listPendingFriendRequests,
  respondFriendRequest,
  sendFriendRequest,
} from "@/lib/friends"

export async function GET(req: NextRequest) {
  try {
    const user = getSession(req)
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const tab = req.nextUrl.searchParams.get("tab")
    if (tab === "pending") {
      const requests = await listPendingFriendRequests(user.userId)
      return NextResponse.json({ requests })
    }

    const friends = await listFriends(user.userId)
    return NextResponse.json({ friends })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getSession(req)
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { userId } = await req.json()
    const targetId = parseInt(userId, 10)
    if (isNaN(targetId)) return NextResponse.json({ error: "Usuario inválido" }, { status: 400 })

    await sendFriendRequest(user.userId, targetId)
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    const status = message.includes("Ya") ? 409 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = getSession(req)
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { requesterId, action } = await req.json()
    const id = parseInt(requesterId, 10)
    if (isNaN(id)) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 })
    if (action !== "accept" && action !== "reject") {
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 })
    }

    await respondFriendRequest(user.userId, id, action)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}
