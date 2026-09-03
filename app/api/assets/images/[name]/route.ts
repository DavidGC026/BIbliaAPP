import path from "path"

import { getServedAssetImage } from "@/lib/asset-image"

const IMAGES = {
  "references-map-hero": {
    file: "references-map-hero.png",
    contentType: "image/png",
  },
  "references-map-loading": {
    file: "references-map-loading.png",
    contentType: "image/png",
  },
} as const

export async function GET(
  request: Request,
  context: { params: Promise<{ name: string }> },
) {
  const { name } = await context.params
  const image = IMAGES[name as keyof typeof IMAGES]

  if (!image) return new Response("Imagen no encontrada", { status: 404 })

  try {
    // Se sirve convertida a WebP y cacheada en el proceso: los PNG originales
    // pesan más de 2 MB. Ver lib/asset-image.ts.
    const served = await getServedAssetImage(
      path.join(process.cwd(), "assets", "images", image.file),
      image.contentType,
    )

    // El ETag va atado al mtime del original, así que reemplazar la ilustración
    // invalida la caché sola y no hace falta esperar a que expire.
    if (request.headers.get("if-none-match") === served.etag) {
      return new Response(null, { status: 304, headers: { ETag: served.etag } })
    }

    return new Response(new Uint8Array(served.body), {
      headers: {
        "Content-Type": served.contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        ETag: served.etag,
      },
    })
  } catch {
    return new Response("Imagen no encontrada", { status: 404 })
  }
}
