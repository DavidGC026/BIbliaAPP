import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getGroupDetail, regenerateGroupInviteCode } from "@/lib/groups"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = getSession(req)
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const groupId = parseInt(id, 10)
    if (isNaN(groupId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const group = await getGroupDetail(groupId, user.userId)
    if (!group) {
      return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ group })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = getSession(req)
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const groupId = parseInt(id, 10)
    if (isNaN(groupId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const body = await req.json()
    if (body.action !== "regenerate_invite") {
      return NextResponse.json({ error: "Acción no soportada" }, { status: 400 })
    }

    const inviteCode = await regenerateGroupInviteCode(groupId, user.userId)
    return NextResponse.json({ success: true, invite_code: inviteCode })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    const status = message.includes("administradores") ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
