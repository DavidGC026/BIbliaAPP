import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getComments, addComment } from "@/lib/bible"

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
    const { content } = body

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Contenido requerido" }, { status: 400 })
    }

    const commentId = await addComment(postId, session.userId, content.trim())
    return NextResponse.json({ success: true, commentId })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al comentar" },
      { status: 500 }
    )
  }
}
