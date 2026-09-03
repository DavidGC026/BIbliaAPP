/**
 * Reduce las imágenes que se suben, para que el navegador no tenga que
 * descodificar el original entero.
 *
 * Por qué: una foto de móvil de 4000×3000 ocupa unos 3 MB en disco pero, al
 * mostrarla, el navegador la descodifica a mapa de bits: 4000·3000·4 bytes =
 * **45 MB de RAM**, aunque se pinte en una tarjeta de 300 px. Con varias
 * portadas en pantalla es, con diferencia, lo que más memoria consume de la
 * web. Aquí no se usa `next/image` (son `<img>` a pelo) y `images.unoptimized`
 * está activado, así que nadie las reescala: hay que hacerlo al guardarlas.
 *
 * Reglas para no empeorar nunca nada:
 *  - Los GIF se dejan intactos (pueden estar animados).
 *  - Si el resultado no pesa menos que el original, se guarda el original.
 *  - Si `sharp` no está disponible, se guarda el original y se avisa.
 *  - Se conserva el formato, porque el mime ya se guardó en la base de datos.
 */

/** Lado mayor permitido según para qué se sube la imagen. */
export const MAX_EDGE = {
  avatar: 512,
  cover: 1600,
  other: 1600,
} as const

export type ImagePurposeSize = keyof typeof MAX_EDGE

export interface ShrinkResult {
  buffer: Buffer
  /** `false` si se devuelve el original tal cual. */
  changed: boolean
  reason?: string
}

type SharpModule = typeof import("sharp")

let sharpPromise: Promise<SharpModule | null> | null = null

/**
 * `sharp` viene como dependencia **opcional** de Next, así que puede no estar
 * (por ejemplo con `npm ci --omit=optional`). Se carga una vez y, si falta, la
 * subida sigue funcionando sin reducir.
 */
async function loadSharp(): Promise<SharpModule | null> {
  if (!sharpPromise) {
    sharpPromise = import("sharp")
      .then((m) => m.default ?? (m as unknown as SharpModule))
      .catch(() => {
        console.warn(
          "[image-resize] sharp no está disponible: las imágenes se guardan sin reducir. " +
            "Añádelo a dependencies para asegurarlo.",
        )
        return null
      })
  }
  return sharpPromise
}

const RESIZABLE = new Set(["png", "jpg", "jpeg", "webp"])

/**
 * Devuelve la imagen reducida al lado mayor pedido, o el original si no se
 * puede o no sale ganando.
 */
export async function shrinkImage(
  buffer: Buffer,
  extension: string,
  maxEdge: number,
): Promise<ShrinkResult> {
  const ext = extension.toLowerCase()
  if (!RESIZABLE.has(ext)) return { buffer, changed: false, reason: `formato ${ext}` }

  const sharp = await loadSharp()
  if (!sharp) return { buffer, changed: false, reason: "sin sharp" }

  try {
    const pipeline = sharp(buffer, { failOn: "error" })
    const meta = await pipeline.metadata()
    if (meta.pages && meta.pages > 1) {
      return { buffer, changed: false, reason: "imagen animada" }
    }

    const out = await sharp(buffer)
      // Sin argumentos aplica la orientación del EXIF y, al reencodificar, se
      // pierden los metadatos: menos bytes y ninguna foto girada.
      .rotate()
      .resize(maxEdge, maxEdge, { fit: "inside", withoutEnlargement: true })
      .toBuffer()

    // Reencodificar un PNG plano puede engordarlo: solo se acepta si mejora.
    if (out.length >= buffer.length) {
      return { buffer, changed: false, reason: "el original ya pesa menos" }
    }
    return { buffer: out, changed: true }
  } catch (err) {
    console.warn("[image-resize] no se pudo reducir, se guarda el original:", err)
    return { buffer, changed: false, reason: "error al procesar" }
  }
}

/** Lado mayor según el `purpose` que manda el formulario de subida. */
export function maxEdgeForPurpose(purpose: string): number {
  if (purpose === "avatar") return MAX_EDGE.avatar
  if (purpose.startsWith("group") || purpose === "church_logo") return MAX_EDGE.cover
  return MAX_EDGE.other
}
