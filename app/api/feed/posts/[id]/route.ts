import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { deleteFeedPost } from "@/lib/bible"

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const postId = parseInt(id, 10)
    if (isNaN(postId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    await deleteFeedPost(postId, session.userId)

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al eliminar la publicación" },
      { status: 500 }
    )
  }
}
