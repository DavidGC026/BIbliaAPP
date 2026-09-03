import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { listBlockedUsers } from "@/lib/moderation"

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const blockedUsers = await listBlockedUsers(session.userId)
    return NextResponse.json({ blockedUsers })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al obtener lista de bloqueados." },
      { status: 500 },
    )
  }
}
