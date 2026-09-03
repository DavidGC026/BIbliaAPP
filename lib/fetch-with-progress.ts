/**
 * Descarga JSON informando del avance real, para poder mostrar una barra de
 * progreso que no sea inventada.
 *
 * Se usa con el agregado de arcos del mapa de referencias, que son ~2 MB: sin
 * esto, lo único que se puede pintar es un spinner sin fin.
 */

export interface DownloadProgress {
  loaded: number
  /** `null` cuando no se puede saber el tamaño total. */
  total: number | null
}

/**
 * Cabecera que manda la ruta con el tamaño **sin comprimir**.
 *
 * `Content-Length` no sirve: con gzip o brotli trae los bytes comprimidos,
 * mientras el lector entrega los ya descomprimidos, así que el avance se
 * pasaría del 100 %.
 */
export const UNCOMPRESSED_BYTES_HEADER = "x-uncompressed-bytes"

/** Cada cuántos bytes se avisa, para no provocar un renderizado por chunk. */
const REPORT_EVERY = 48 * 1024

function readTotal(response: Response): number | null {
  const hinted = Number(response.headers.get(UNCOMPRESSED_BYTES_HEADER))
  if (Number.isFinite(hinted) && hinted > 0) return hinted
  const encoded = response.headers.get("content-encoding")
  // Comprimido y sin pista: Content-Length mide otra cosa, mejor no usarlo.
  if (encoded && encoded !== "identity") return null
  const length = Number(response.headers.get("content-length"))
  return Number.isFinite(length) && length > 0 ? length : null
}

/**
 * Devuelve un `fetcher` para SWR que va informando de lo descargado.
 *
 * Si el navegador no permite leer el cuerpo por trozos, cae en un `json()`
 * normal: se pierde el detalle del avance, no la descarga.
 */
export function createProgressFetcher<T>(
  onProgress: (progress: DownloadProgress) => void,
): (url: string) => Promise<T> {
  return async function fetchWithProgress(url: string): Promise<T> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`La petición falló con ${response.status}`)
    }

    const total = readTotal(response)
    const body = response.body
    if (!body?.getReader) {
      onProgress({ loaded: 0, total })
      return (await response.json()) as T
    }

    const reader = body.getReader()
    // Se descodifica al vuelo y se acumula texto: así no hay que guardar
    // además todos los trozos en crudo ni concatenarlos al final.
    const decoder = new TextDecoder("utf-8")
    let text = ""
    let loaded = 0
    let reported = 0

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      loaded += value.byteLength
      text += decoder.decode(value, { stream: true })
      if (loaded - reported >= REPORT_EVERY) {
        reported = loaded
        onProgress({ loaded, total })
      }
    }
    text += decoder.decode()
    onProgress({ loaded, total: total ?? loaded })

    return JSON.parse(text) as T
  }
}

/** Fracción 0–1 para la barra, o `null` si aún no se puede saber. */
export function progressRatio(progress: DownloadProgress | null): number | null {
  if (!progress || !progress.total) return null
  const ratio = progress.loaded / progress.total
  if (!Number.isFinite(ratio)) return null
  // Nunca se muestra completo antes de tiempo: el 100 % lo pone quien termina.
  return Math.max(0, Math.min(0.99, ratio))
}
