import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { likePost, unlikePost, getPostAuthor, createNotification, getUserById } from "@/lib/bible"
import { emitNotification } from "@/lib/notification-bus"

export async function POST(
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
      return NextResponse.json({ error: "ID de publicación inválido" }, { status: 400 })
    }

    await likePost(session.userId, postId)

    try {
      const postAuthorId = await getPostAuthor(postId)
      if (postAuthorId != null && postAuthorId !== session.userId) {
        const actor = await getUserById(session.userId)
        await createNotification(postAuthorId, session.userId, "like", postId)
        emitNotification(postAuthorId, {
          type: "like",
          postId,
          actorName: actor?.name || "Alguien",
        })
      }
    } catch (notifyErr) {
      console.error("Error creando notificación de like:", notifyErr)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al dar like" },
      { status: 500 }
    )
  }
}

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

    await unlikePost(session.userId, postId)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al quitar me gusta" },
      { status: 500 }
    )
  }
}
