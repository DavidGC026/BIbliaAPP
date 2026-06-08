import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getUserByUsername, getUserPosts } from "@/lib/bible"

export async function GET(
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

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get("limit") || "20", 10)
    const offset = parseInt(searchParams.get("offset") || "0", 10)

    const posts = await getUserPosts(user.id, session.userId, limit, offset)

    return NextResponse.json({ posts })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al obtener las publicaciones" },
      { status: 500 }
    )
  }
}
