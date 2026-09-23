import sharp from "sharp"
import { RequestError } from "./request-security"

export const MAX_EDGE = { avatar: 512, cover: 1600, other: 1600 } as const
export function maxEdgeForPurpose(purpose: string): number {
  if (purpose === "avatar") return MAX_EDGE.avatar
  if (purpose.startsWith("group") || purpose === "church_logo") return MAX_EDGE.cover
  return MAX_EDGE.other
}

/** Solo formatos raster reconocidos por el decodificador; se eliminan metadatos y contenido sobrante. */
export async function prepareUploadedImage(buffer: Buffer, maxEdge: number) {
  try {
    const options = { failOn: "error" as const, limitInputPixels: 40_000_000, animated: true }
    const metadata = await sharp(buffer, options).metadata()
    const format = metadata.format
    if (!format || !["png", "jpeg", "webp", "gif"].includes(format) || !metadata.width || !metadata.height ||
        metadata.width * metadata.height > 40_000_000 || (metadata.pages || 1) > 200) throw new Error("Formato o dimensiones inválidas")
    const output = await sharp(buffer, options).rotate().resize(maxEdge, maxEdge, { fit: "inside", withoutEnlargement: true }).toBuffer()
    return { buffer: output, extension: format === "jpeg" ? "jpg" : format, mimeType: `image/${format}` }
  } catch { throw new RequestError("Imagen inválida. Usa PNG, JPEG, WebP o GIF de hasta 40 megapíxeles.") }
}
