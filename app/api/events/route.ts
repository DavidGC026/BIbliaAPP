import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import {
  createEvent,
  deleteEvent,
  listEventsWithUserRsvp,
  listUpcomingEvents,
  setEventRsvp,
} from "@/lib/church-events"
import { listUserGroupEventsAcrossGroups } from "@/lib/group-events"

function mergeCalendarEvents(churchEvents: Record<string, unknown>[], groupEvents: Record<string, unknown>[]) {
  const merged = [
    ...churchEvents.map((e) => ({ ...e, source: "church" as const })),
    ...groupEvents.map((e) => ({ ...e, source: "group" as const, category: "grupo" })),
  ]
  merged.sort(
    (a, b) => new Date(a.start_time as string).getTime() - new Date(b.start_time as string).getTime(),
  )
  return merged
}

export async function GET(req: NextRequest) {
  try {
    const user = getSession(req)
    if (user) {
      const [churchEvents, groupEvents] = await Promise.all([
        listEventsWithUserRsvp(user.userId),
        listUserGroupEventsAcrossGroups(user.userId),
      ])
      return NextResponse.json({ events: mergeCalendarEvents(churchEvents, groupEvents) })
    }
    const events = await listUpcomingEvents()
    return NextResponse.json({ events: events.map((e) => ({ ...e, source: "church" })) })
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
    const isAdmin = user.role === "admin"

    if (body.action === "rsvp") {
      const { eventId, status } = body
      if (!eventId || !status) return NextResponse.json({ error: "Faltan campos" }, { status: 400 })
      await setEventRsvp(eventId, user.userId, status)
      return NextResponse.json({ success: true })
    }

    const { title, description, startTime, endTime, location, category } = body
    if (!title?.trim() || !startTime) {
      return NextResponse.json({ error: "Título y fecha requeridos" }, { status: 400 })
    }

    const id = await createEvent(
      user.userId,
      { title, description, startTime, endTime, location, category },
      isAdmin,
    )
    return NextResponse.json({ success: true, id })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    const status = message.includes("administradores") ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = getSession(req)
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const eventId = req.nextUrl.searchParams.get("id")
    if (!eventId) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

    await deleteEvent(parseInt(eventId, 10), user.userId, user.role === "admin")
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}
