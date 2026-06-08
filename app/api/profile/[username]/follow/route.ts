import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getUserByUsername, followUser, unfollowUser } from "@/lib/bible"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { username } = await params
    const user = await getUserByUsername(username)
    if (!user) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 })
    }

    if (user.id === session.userId) {
      return NextResponse.json({ error: "No puedes seguirte a ti mismo" }, { status: 400 })
    }

    await followUser(session.userId, user.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al seguir al usuario" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { username } = await params
    const user = await getUserByUsername(username)
    if (!user) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 })
    }

    await unfollowUser(session.userId, user.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al dejar de seguir al usuario" },
      { status: 500 }
    )
  }
}
