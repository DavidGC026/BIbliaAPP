import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { joinPrayerIntercession, listGroupPrayers } from "@/lib/prayers"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = getSession(req)
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const groupId = parseInt(id, 10)
    const prayers = await listGroupPrayers(groupId, user.userId)
    return NextResponse.json({ prayers })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = getSession(req)
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { prayerId } = await req.json()
    if (!prayerId) return NextResponse.json({ error: "prayerId requerido" }, { status: 400 })

    const result = await joinPrayerIntercession(prayerId, user.userId)
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}
