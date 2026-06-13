import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import {
  assignGroupReadingPlan,
  createGroupDiscussion,
  createGroupPost,
  getGroupReadingPlan,
  listGroupDiscussions,
  listGroupPosts,
} from "@/lib/group-features"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = getSession(req)
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const groupId = parseInt(id, 10)
    const tab = req.nextUrl.searchParams.get("tab")

    if (tab === "plan") {
      const plan = await getGroupReadingPlan(groupId, user.userId)
      return NextResponse.json({ plan })
    }
    if (tab === "posts") {
      const posts = await listGroupPosts(groupId, user.userId)
      return NextResponse.json({ posts })
    }
    if (tab === "discussions") {
      const discussions = await listGroupDiscussions(groupId, user.userId)
      return NextResponse.json({ discussions })
    }

    return NextResponse.json({ error: "Tab inválido" }, { status: 400 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = getSession(req)
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const groupId = parseInt(id, 10)
    const body = await req.json()
    const { action, content, parentId, planId } = body

    if (action === "post") {
      if (!content?.trim()) return NextResponse.json({ error: "Contenido requerido" }, { status: 400 })
      const postId = await createGroupPost(groupId, user.userId, content)
      return NextResponse.json({ success: true, id: postId })
    }

    if (action === "discuss") {
      if (!content?.trim()) return NextResponse.json({ error: "Contenido requerido" }, { status: 400 })
      const discussionId = await createGroupDiscussion(groupId, user.userId, content, parentId)
      return NextResponse.json({ success: true, id: discussionId })
    }

    if (action === "assign_plan") {
      if (!planId) return NextResponse.json({ error: "planId requerido" }, { status: 400 })
      await assignGroupReadingPlan(groupId, user.userId, planId)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Acción inválida" }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    const status = message.includes("administradores") ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
