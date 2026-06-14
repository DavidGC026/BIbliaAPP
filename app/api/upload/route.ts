import { writeFile } from "fs/promises"
import { join } from "path"
import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import {
  createUserMedia,
  ensureUserMediaTables,
  setUserAvatar,
  type AvatarVisibility,
} from "@/lib/user-media"

const ALLOWED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif"])
const ALLOWED_MIME_PREFIXES = ["image/"]

function extensionFromFile(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase()
  if (fromName && ALLOWED_EXTENSIONS.has(fromName)) return fromName
  const mimeMap: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
  }
  return mimeMap[file.type] || "png"
}

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
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const purpose = (formData.get("purpose") as string) || "other"

    if (!file) {
      return NextResponse.json({ error: "No se encontró ningún archivo" }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "El archivo es demasiado grande (máx 10MB)" }, { status: 400 })
    }

    if (!ALLOWED_MIME_PREFIXES.some((p) => file.type.startsWith(p))) {
      return NextResponse.json({ error: "Solo se permiten imágenes" }, { status: 400 })
    }

    const extension = extensionFromFile(file)
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json({ error: "Formato de imagen no permitido" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filename = `${crypto.randomUUID()}.${extension}`
    const uploadDir = join(process.cwd(), "public", "uploads")
    const filepath = join(uploadDir, filename)
    await writeFile(filepath, buffer)

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
      file.type,
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
    console.error("Error uploading file:", err)
    return NextResponse.json({ error: "Error al subir el archivo" }, { status: 500 })
  }
}
