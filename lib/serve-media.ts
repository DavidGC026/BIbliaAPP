import { NextResponse } from "next/server"
import { getSession } from "./auth"
import { canViewMedia } from "./media-privacy"
import { getUserMediaByFilename, getUserMediaById } from "./user-media"
import { readUpload, safeUploadFilename } from "./upload-storage"

const types: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", pdf: "application/pdf" }
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox", "Vary": "Cookie, Authorization" }

export async function serveMedia(req: Request, reference: { id: string } | { filename: string }) {
  const error = (status: number) => new NextResponse(null, { status, headers })
  try {
    const session = await getSession(req)
    if (!session) return error(401)
    if ("filename" in reference && !safeUploadFilename(reference.filename)) return error(400)
    if ("id" in reference && (!/^[1-9]\d*$/.test(reference.id) || !Number.isSafeInteger(Number(reference.id)))) return error(400)
    const media = "id" in reference ? await getUserMediaById(Number(reference.id)) : await getUserMediaByFilename(reference.filename)
    // Sin dueño y reglas registradas, un archivo nunca es público por defecto.
    if (!media) return error(404)
    if (!await canViewMedia(session.userId, { user_id: Number(media.user_id), kind: String(media.kind), visibility: String(media.visibility) })) return error(403)
    if (!safeUploadFilename(media.filename)) return error(404)
    const file = await readUpload(media.filename)
    return new NextResponse(new Uint8Array(file), { headers: {
      ...headers, "Content-Type": types[media.filename.split(".").pop()!.toLowerCase()],
      "Content-Disposition": `inline; filename="${media.filename}"`,
    } })
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return error(404)
    console.error("No se pudo servir el archivo", cause)
    return error(503)
  }
}
