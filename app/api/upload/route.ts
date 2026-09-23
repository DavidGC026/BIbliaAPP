import { saveUpload } from "@/lib/upload-storage"
import { readBoundedBody, securityErrorResponse } from "@/lib/request-security"
import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { maxEdgeForPurpose, prepareUploadedImage } from "@/lib/image-resize"
import {
  createUserMedia,
  ensureUserMediaTables,
  setUserAvatar,
  type AvatarVisibility,
} from "@/lib/user-media"

function purposeToKind(purpose: string): "avatar" | "group" | "church_logo" | "other" {
  if (purpose === "avatar") return "avatar"
  if (purpose === "group" || purpose === "group_event" || purpose === "group_cover") return "group"
  if (purpose === "church_logo") return "church_logo"
  return "other"
}

function purposeToVisibility(purpose: string): AvatarVisibility {
  if (purpose === "church_logo") return "church"
  if (purpose.startsWith("group")) return "groups"
  return "groups"
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await readBoundedBody(req, 10 * 1024 * 1024 + 64 * 1024)
    const formData = await new Response(body, { headers: { "Content-Type": req.headers.get("content-type") || "" } }).formData()
    const file = formData.get("file") as File | null
    const rawPurpose = formData.get("purpose")
    const purpose = typeof rawPurpose === "string" ? rawPurpose.slice(0, 64) : "other"

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No se encontró ningún archivo" }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "El archivo es demasiado grande (máx 10MB)" }, { status: 400 })
    }

    const original = Buffer.from(await file.arrayBuffer())
    const { buffer, extension, mimeType } = await prepareUploadedImage(original, maxEdgeForPurpose(purpose))
    const filename = `${crypto.randomUUID()}.${extension}`
    await saveUpload(filename, buffer)

    await ensureUserMediaTables()
    const kind = purposeToKind(purpose)
    let visibility = purposeToVisibility(purpose)

    if (purpose === "avatar") {
      const pool = await import("@/lib/mysql").then((m) => m.getPool())
      const [rows] = await pool.query(
        "SELECT avatar_visibility FROM users WHERE id = ? LIMIT 1",
        [session.userId],
      )
      visibility =
        ((rows as { avatar_visibility?: string }[])[0]?.avatar_visibility as AvatarVisibility) ||
        "groups"
    }

    const mediaId = await createUserMedia(
      session.userId,
      filename,
      mimeType,
      kind,
      visibility,
    )

    if (purpose === "avatar") {
      await setUserAvatar(session.userId, mediaId)
    }

    return NextResponse.json({
      url: `/api/media/${mediaId}`,
      mediaId,
      filename,
    })
  } catch (err) {
    return securityErrorResponse(err)
  }
}
