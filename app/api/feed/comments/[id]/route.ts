import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { deleteComment } from "@/lib/bible"

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const commentId = parseInt(id, 10)
    if (isNaN(commentId)) {
      return NextResponse.json({ error: "ID de comentario inválido" }, { status: 400 })
    }

    // Soft delete: solo el autor; las respuestas hijas conservan su lugar
    const deleted = await deleteComment(commentId, session.userId)
    if (!deleted) {
      return NextResponse.json(
        { error: "No encontrado o sin permiso para eliminarlo" },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al eliminar comentario" },
      { status: 500 },
    )
  }
}
