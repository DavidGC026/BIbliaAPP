import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import {
  getMentorDiscipleProgress,
  listDiscipleshipForUser,
  requestDiscipleship,
  respondDiscipleship,
} from "@/lib/discipleship"

export async function GET(req: NextRequest) {
  try {
    const user = getSession(req)
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const discipleId = req.nextUrl.searchParams.get("discipleId")
    if (discipleId) {
      const progress = await getMentorDiscipleProgress(user.userId, parseInt(discipleId, 10))
      return NextResponse.json({ progress })
    }

    const data = await listDiscipleshipForUser(user.userId)
    return NextResponse.json(data)
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

    const body = await req.json()

    if (body.action === "respond") {
      const { id, accept } = body
      if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })
      await respondDiscipleship(id, user.userId, !!accept)
      return NextResponse.json({ success: true })
    }

    const { mentorUsername } = body
    if (!mentorUsername?.trim()) {
      return NextResponse.json({ error: "Apodo del mentor requerido" }, { status: 400 })
    }

    const id = await requestDiscipleship(user.userId, mentorUsername.trim())
    return NextResponse.json({ success: true, id })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}
