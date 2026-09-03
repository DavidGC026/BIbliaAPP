import { readFile, stat } from "fs/promises"

/**
 * Sirve las ilustraciones de `assets/images/` convertidas a WebP y cacheadas en
 * el proceso.
 *
 * Por qué: son PNG de más de 2 MB. La de carga del mapa pesaba **más que los
 * datos que tapa** (2,14 MB frente a 1,98 MB), así que nunca llegaba a tiempo y
 * la pantalla se quedaba vacía. En WebP a 1600 px se quedan en 85–130 KB, o sea
 * unas 20 veces menos, y llegan enseguida.
 *
 * No se guardan derivados en disco: la conversión se hace la primera vez y se
 * queda en memoria, con la clave atada al **mtime y el tamaño** del original.
 * Así, si se reemplaza la ilustración, la versión servida se regenera sola sin
 * que haya que acordarse de ningún script.
 *
 * Si `sharp` no está (es dependencia opcional de Next), se sirve el PNG tal
 * cual: pesado, pero funcionando.
 */

const MAX_EDGE = 1600
const QUALITY = 80

export interface ServedImage {
  body: Buffer
  contentType: string
  /** Para responder 304 cuando el navegador ya la tiene. */
  etag: string
}

interface CacheEntry extends ServedImage {
  signature: string
}

const cache = new Map<string, CacheEntry>()

type SharpModule = typeof import("sharp")
let sharpPromise: Promise<SharpModule | null> | null = null

async function loadSharp(): Promise<SharpModule | null> {
  if (!sharpPromise) {
    sharpPromise = import("sharp")
      .then((m) => m.default ?? (m as unknown as SharpModule))
      .catch(() => {
        console.warn("[asset-image] sin sharp: las ilustraciones se sirven sin optimizar")
        return null
      })
  }
  return sharpPromise
}

/**
 * Devuelve la imagen lista para responder. `fallbackContentType` se usa cuando
 * no se puede convertir.
 */
export async function getServedAssetImage(
  filePath: string,
  fallbackContentType: string,
): Promise<ServedImage> {
  const info = await stat(filePath)
  const signature = `${info.mtimeMs}-${info.size}`

  const hit = cache.get(filePath)
  if (hit && hit.signature === signature) return hit

  const original = await readFile(filePath)
  let served: ServedImage = {
    body: original,
    contentType: fallbackContentType,
    etag: `"${signature}-orig"`,
  }

  const sharp = await loadSharp()
  if (sharp) {
    try {
      const webp = await sharp(original)
        .resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toBuffer()
      // Solo si mejora, que es lo normal aquí pero no una ley.
      if (webp.length < original.length) {
        served = { body: webp, contentType: "image/webp", etag: `"${signature}-webp"` }
      }
    } catch (err) {
      console.warn("[asset-image] no se pudo convertir, se sirve el original:", err)
    }
  }

  cache.set(filePath, { ...served, signature })
  return served
}
