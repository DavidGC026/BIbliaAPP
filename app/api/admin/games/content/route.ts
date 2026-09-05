import { NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { getSession } from "@/lib/auth"
import { getPool } from "@/lib/mysql"
import { GameContentError, getGameContent, saveGameContent } from "@/lib/game-content-store"

async function administrator(req: Request) {
  const session = getSession(req)
  if (!session) throw new GameContentError("Inicia sesión para administrar el contenido.", 401)
  const [rows] = await getPool().query<RowDataPacket[]>("SELECT role FROM users WHERE id = ?", [session.userId])
  if (session.role !== "admin" || rows[0]?.role !== "admin") throw new GameContentError("Se requieren permisos de administrador.", 403)
  return session.userId
}
function failure(error: unknown) {
  if (error instanceof GameContentError) return NextResponse.json({ error: error.message }, { status: error.status })
  if (error instanceof SyntaxError) return NextResponse.json({ error: "La solicitud no contiene un catálogo válido." }, { status: 400 })
  console.error("Error administrando juegos", error)
  return NextResponse.json({ error: "No se pudo guardar o cargar el contenido. Intenta de nuevo." }, { status: 500 })
}
export async function GET(req: Request) {
  try {
    await administrator(req)
    const content = await getGameContent()
    const [books] = await getPool().query<RowDataPacket[]>("SELECT idBook AS bookId, name FROM bible_books WHERE idBook BETWEEN 1 AND 66 ORDER BY idBook")
    return NextResponse.json({ ...content, books }, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) { return failure(error) }
}
export async function PUT(req: Request) {
  try {
    const userId = await administrator(req)
    const raw = await req.text()
    if (raw.length > 1_000_000) throw new GameContentError("El catálogo excede el tamaño permitido.", 413)
    const body = JSON.parse(raw)
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new GameContentError("La solicitud no contiene un catálogo válido.", 400)
    const { catalog, revision } = body
    const content = await saveGameContent(catalog, revision, userId)
    return NextResponse.json(content, { headers: { "Cache-Control": "no-store" } })
  } catch (error) { return failure(error) }
}
