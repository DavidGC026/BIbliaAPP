import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { isValidGroupRole } from "@/lib/group-roles"
import { listGroupMembers, updateGroupMemberRole } from "@/lib/groups"

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

    const members = await listGroupMembers(groupId, user.userId)
    return NextResponse.json({ members })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    const status = message.includes("miembro") ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(
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
    const targetUserId = parseInt(body.userId, 10)
    const role = body.role as string

    if (isNaN(targetUserId)) {
      return NextResponse.json({ error: "Usuario inválido" }, { status: 400 })
    }
    if (!isValidGroupRole(role)) {
      return NextResponse.json({ error: "Rol no válido" }, { status: 400 })
    }

    await updateGroupMemberRole(groupId, user.userId, targetUserId, role)
    const members = await listGroupMembers(groupId, user.userId)
    return NextResponse.json({ success: true, members })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    const status = message.includes("administradores") || message.includes("administrador")
      ? 403
      : message.includes("no pertenece")
        ? 404
        : 500
    return NextResponse.json({ error: message }, { status })
  }
}
