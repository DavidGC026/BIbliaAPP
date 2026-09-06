import { NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { getSession } from "@/lib/auth"
import { getPool } from "@/lib/mysql"
import { synchronizeGameProgress } from "@/lib/game-progress-store"
import { parseOperation } from "@/lib/games/sync"

export async function POST(request: Request) {
  const session = getSession(request)
  if (!session) return NextResponse.json({ error: "Inicia sesión para sincronizar tus juegos." }, { status: 401 })
  try {
    const [users] = await getPool().query<RowDataPacket[]>("SELECT id FROM users WHERE id = ?", [session.userId])
    if (!users.length) return NextResponse.json({ error: "La cuenta ya no está disponible." }, { status: 401 })
    const raw = await request.text()
    if (raw.length > 600000) return NextResponse.json({ error: "Envía menos cambios de progreso a la vez." }, { status: 413 })
    let body, operations
    try {
      body = JSON.parse(raw)
      if (!body || !Array.isArray(body.operations) || body.operations.length > 100) throw new Error("La lista de cambios no es válida.")
      if (body.accountId !== session.userId) return NextResponse.json({ error: "La sesión cambió. Vuelve a abrir tus juegos." }, { status: 403 })
      operations = body.operations.map(parseOperation)
    } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo leer el progreso." }, { status: 400 }) }
    const result = await synchronizeGameProgress(session.userId, operations)
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    console.error("Error sincronizando juegos", error)
    return NextResponse.json({ error: "Tus juegos siguen guardados aquí. Intenta sincronizar más tarde." }, { status: 503 })
  }
}
