import { type NextRequest, NextResponse } from "next/server"
import { getAllLinks } from "@/lib/bible"
import { getSession } from "@/lib/auth"
import { assertBibleAccess, bibleAccessStatus } from "@/lib/bible-access"

/**
 * Todas las notas de versículo del usuario.
 *
 * `/api/links` solo sabe responder por capítulo, que sirve para pintar el
 * lector pero no para encontrar lo que uno escribió hace un mes. Esto es lo que
 * alimenta la sección «Versículos con notas».
 *
 * `?bible=` es opcional y solo decide con qué traducción se adjunta el texto
 * del versículo: la nota es del versículo, no de la versión.
 */
export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    const bibleParam = new URL(req.url).searchParams.get("bible")
    const bibleId = bibleParam ? Number(bibleParam) : undefined
    if (bibleId) await assertBibleAccess(req, bibleId)

    const links = await getAllLinks(session.userId, bibleId || undefined)
    return NextResponse.json({ links })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: bibleAccessStatus(err) },
    )
  }
}
