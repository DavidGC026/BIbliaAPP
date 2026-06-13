import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getUserById } from "@/lib/bible"
import { canViewUserAvatar } from "@/lib/media-privacy"
import {
  AVATAR_VISIBILITY_LABELS,
  type AvatarVisibility,
} from "@/lib/avatar-visibility"
import { ensureUserMediaTables } from "@/lib/user-media"
import { getPool } from "@/lib/mysql"

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    await ensureUserMediaTables()
    const user = await getUserById(session.userId)
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })

    const canView = await canViewUserAvatar(session.userId, session.userId)
    return NextResponse.json({
      avatarMediaId: user.avatarMediaId,
      avatarVisibility: user.avatarVisibility || "groups",
      avatarUrl: canView && user.avatarMediaId ? `/api/media/${user.avatarMediaId}` : null,
      visibilityOptions: AVATAR_VISIBILITY_LABELS,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const body = await req.json()
    await ensureUserMediaTables()
    const pool = getPool()

    if (body.username !== undefined) {
      const sanitizedUsername = String(body.username).toLowerCase().replace(/[^a-z0-9_]/g, "")
      if (sanitizedUsername.length < 3 || sanitizedUsername.length > 30) {
        return NextResponse.json({ error: "Apodo inválido" }, { status: 400 })
      }
      const [existing] = await pool.query(
        "SELECT id FROM users WHERE username = ? AND id != ?",
        [sanitizedUsername, session.userId],
      )
      if (Array.isArray(existing) && existing.length > 0) {
        return NextResponse.json({ error: "Este apodo ya está en uso" }, { status: 409 })
      }
      await pool.query("UPDATE users SET username = ? WHERE id = ?", [sanitizedUsername, session.userId])
    }

    if (body.avatarVisibility !== undefined) {
      const vis = body.avatarVisibility as AvatarVisibility
      const valid = ["private", "friends", "church", "groups", "public"]
      if (!valid.includes(vis)) {
        return NextResponse.json({ error: "Visibilidad inválida" }, { status: 400 })
      }
      await pool.query("UPDATE users SET avatar_visibility = ? WHERE id = ?", [vis, session.userId])
      if (body.avatarMediaId) {
        await pool.query("UPDATE user_media SET visibility = ? WHERE id = ? AND user_id = ?", [
          vis,
          body.avatarMediaId,
          session.userId,
        ])
      }
    }

    if (body.avatarMediaId !== undefined) {
      await pool.query("UPDATE users SET avatar_media_id = ? WHERE id = ?", [
        body.avatarMediaId,
        session.userId,
      ])
    }

    const user = await getUserById(session.userId)
    return NextResponse.json({
      success: true,
      avatarMediaId: user?.avatarMediaId,
      avatarVisibility: user?.avatarVisibility,
      avatarUrl: user?.avatarMediaId ? `/api/media/${user.avatarMediaId}` : null,
      username: user?.username,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al actualizar el perfil" },
      { status: 500 },
    )
  }
}
