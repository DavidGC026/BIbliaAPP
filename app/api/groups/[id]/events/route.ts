import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import {
  createGroupEvent,
  deleteGroupEvent,
  listGroupEvents,
  processGroupEventRemindersThrottled,
} from "@/lib/group-events"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = getSession(req)
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    await processGroupEventRemindersThrottled()

    const { id } = await params
    const groupId = parseInt(id, 10)
    const events = await listGroupEvents(groupId, user.userId)
    return NextResponse.json({ events })
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

    const { id } = await params
    const groupId = parseInt(id, 10)
    const body = await req.json()
    const { title, description, imageUrl, startTime, endTime, location } = body

    if (!title?.trim() || !startTime) {
      return NextResponse.json({ error: "Título y fecha de inicio requeridos" }, { status: 400 })
    }

    const eventId = await createGroupEvent(groupId, user.userId, {
      title,
      description,
      imageUrl,
      startTime,
      endTime,
      location,
    })
    return NextResponse.json({ success: true, id: eventId })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    const status = message.includes("administradores") || message.includes("líderes") ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = getSession(req)
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const groupId = parseInt(id, 10)
    const eventId = req.nextUrl.searchParams.get("eventId")
    if (!eventId) return NextResponse.json({ error: "eventId requerido" }, { status: 400 })

    await deleteGroupEvent(groupId, parseInt(eventId, 10), user.userId)
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    const status = message.includes("administradores") || message.includes("no encontrado") ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
