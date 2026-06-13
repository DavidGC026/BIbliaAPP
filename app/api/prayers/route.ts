import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import {
  createPrayer,
  deletePrayer,
  listUserPrayers,
  updatePrayerStatus,
} from "@/lib/prayers"

export async function GET(req: NextRequest) {
  try {
    const user = getSession(req)
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const prayers = await listUserPrayers(user.userId)
    return NextResponse.json({ prayers })
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

    const { title, description, visibility, groupId } = await req.json()
    if (!title?.trim()) return NextResponse.json({ error: "Título requerido" }, { status: 400 })

    const id = await createPrayer(
      user.userId,
      title.trim(),
      description || "",
      visibility === "group" ? "group" : "private",
      groupId,
    )
    return NextResponse.json({ id, title, description, status: "active", visibility })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = getSession(req)
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id, status } = await req.json()
    if (!id || !status) return NextResponse.json({ error: "Faltan campos" }, { status: 400 })

    await updatePrayerStatus(user.userId, id, status)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 404 },
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = getSession(req)
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const id = req.nextUrl.searchParams.get("id")
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

    await deletePrayer(user.userId, parseInt(id, 10))
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 404 },
    )
  }
}
