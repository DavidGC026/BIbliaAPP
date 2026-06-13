import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { joinGroupByInviteCode } from "@/lib/groups"

export async function POST(req: NextRequest) {
  try {
    const user = getSession(req)
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { inviteCode } = await req.json()
    if (!inviteCode?.trim()) {
      return NextResponse.json({ error: "Código de invitación requerido" }, { status: 400 })
    }

    const result = await joinGroupByInviteCode(user.userId, inviteCode)
    return NextResponse.json({
      success: true,
      groupId: result.groupId,
      alreadyMember: result.alreadyMember,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    const status = message.includes("no válido") ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
