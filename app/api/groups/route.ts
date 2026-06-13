import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { createGroup, listUserGroups } from "@/lib/groups"

export async function GET(req: NextRequest) {
  try {
    const user = getSession(req)
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const groups = await listUserGroups(user.userId)
    return NextResponse.json({ groups })
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

    const { name, description, cover_image, avatar_image } = await req.json()
    if (!name?.trim()) {
      return NextResponse.json({ error: "Nombre del grupo requerido" }, { status: 400 })
    }

    const group = await createGroup(
      user.userId,
      name.trim(),
      description || "",
      cover_image || null,
      avatar_image || null,
    )
    return NextResponse.json(group)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}
