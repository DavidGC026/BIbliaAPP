import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import {
  getComments,
  addComment,
  getCommentById,
  getPostAuthor,
  createNotification,
  getUserById,
} from "@/lib/bible"
import { emitNotification } from "@/lib/notification-bus"

export async function GET(
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

    const comments = await getComments(postId)
    return NextResponse.json({ comments })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al obtener comentarios" },
      { status: 500 }
    )
  }
}

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

    const body = await req.json()
    const { content, parentId } = body

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Contenido requerido" }, { status: 400 })
    }

    // Validar que el padre exista, no esté borrado y pertenezca al mismo post
    let parentAuthorId: number | null = null
    if (parentId != null) {
      if (typeof parentId !== "number") {
        return NextResponse.json({ error: "parentId inválido" }, { status: 400 })
      }
      const parent = await getCommentById(parentId)
      if (!parent || parent.post_id !== postId || parent.is_deleted) {
        return NextResponse.json({ error: "Comentario padre inválido" }, { status: 400 })
      }
      parentAuthorId = parent.user_id
    }

    const commentId = await addComment(postId, session.userId, content.trim(), parentId ?? null)

    // Notificaciones: al autor del padre (reply) y al autor del post (comment).
    // createNotification ignora auto-notificaciones; evitamos duplicar destinatario.
    try {
      const actor = await getUserById(session.userId)
      const actorName = actor?.name || "Alguien"
      const postAuthorId = await getPostAuthor(postId)
      const notified = new Set<number>([session.userId])

      if (parentAuthorId != null && !notified.has(parentAuthorId)) {
        await createNotification(parentAuthorId, session.userId, "reply", postId, commentId)
        emitNotification(parentAuthorId, { type: "reply", postId, commentId, actorName })
        notified.add(parentAuthorId)
      }
      if (postAuthorId != null && !notified.has(postAuthorId)) {
        await createNotification(postAuthorId, session.userId, "comment", postId, commentId)
        emitNotification(postAuthorId, { type: "comment", postId, commentId, actorName })
      }
    } catch (notifyErr) {
      // Las notificaciones nunca deben tumbar la creación del comentario
      console.error("Error creando notificación:", notifyErr)
    }

    return NextResponse.json({ success: true, commentId })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al comentar" },
      { status: 500 }
    )
  }
}
