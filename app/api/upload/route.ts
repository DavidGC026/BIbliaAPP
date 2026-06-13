import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import {
  createUserMedia,
  ensureUserMediaTables,
  setUserAvatar,
  type AvatarVisibility,
} from "@/lib/user-media"
import { writeFile } from "fs/promises"
import { join } from "path"

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

    if (file.type.startsWith("video/")) {
      return NextResponse.json({ error: "No se permiten archivos de video por ahora" }, { status: 400 })
    }

    if (purpose === "avatar" && !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "La foto de perfil debe ser una imagen" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const extension = file.name.split(".").pop() || "png"
    const filename = `${crypto.randomUUID()}.${extension}`

    const uploadDir = join(process.cwd(), "public", "uploads")
    const filepath = join(uploadDir, filename)

    await writeFile(filepath, buffer)

    if (purpose === "avatar") {
      await ensureUserMediaTables()
      const pool = await import("@/lib/mysql").then((m) => m.getPool())
      const [rows] = await pool.query(
        "SELECT avatar_visibility FROM users WHERE id = ? LIMIT 1",
        [session.userId],
      )
      const visibility =
        ((rows as { avatar_visibility?: string }[])[0]?.avatar_visibility as AvatarVisibility) ||
        "groups"

      const mediaId = await createUserMedia(
        session.userId,
        filename,
        file.type,
        "avatar",
        visibility,
      )
      await setUserAvatar(session.userId, mediaId)
      return NextResponse.json({
        url: `/api/media/${mediaId}`,
        mediaId,
        filename,
      })
    }

    return NextResponse.json({ url: `/api/uploads/${filename}`, filename })
  } catch (err) {
    console.error("Error uploading file:", err)
    return NextResponse.json({ error: "Error al subir el archivo" }, { status: 500 })
  }
}
