import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { blockUser, unblockUser } from "@/lib/moderation"

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await req.json()
    const targetUserId = parseInt(body.userId, 10)

    if (isNaN(targetUserId) || targetUserId <= 0) {
      return NextResponse.json({ error: "ID de usuario inválido." }, { status: 400 })
    }

    if (targetUserId === session.userId) {
      return NextResponse.json({ error: "No puedes bloquearte a ti mismo." }, { status: 400 })
    }

    await blockUser(session.userId, targetUserId)

    return NextResponse.json({
      success: true,
      message: "Usuario bloqueado. Ya no verás sus publicaciones ni podrá interactuar contigo.",
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al bloquear usuario." },
      { status: 500 },
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const targetUserId = parseInt(searchParams.get("userId") || "", 10)

    if (isNaN(targetUserId) || targetUserId <= 0) {
      return NextResponse.json({ error: "ID de usuario inválido." }, { status: 400 })
    }

    await unblockUser(session.userId, targetUserId)

    return NextResponse.json({
      success: true,
      message: "Usuario desbloqueado.",
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al desbloquear usuario." },
      { status: 500 },
    )
  }
}
