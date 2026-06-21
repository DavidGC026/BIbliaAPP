import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { deletePushToken, upsertPushToken } from "@/lib/push-tokens"

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { token, platform = "android" } = await req.json()
    if (!token || typeof token !== "string" || !token.startsWith("ExponentPushToken")) {
      return NextResponse.json({ error: "Token Expo Push inválido." }, { status: 400 })
    }

    await upsertPushToken(session.userId, token, platform)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al registrar token" },
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

    const { token } = await req.json()
    if (token) {
      await deletePushToken(session.userId, token)
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al eliminar token" },
      { status: 500 },
    )
  }
}
