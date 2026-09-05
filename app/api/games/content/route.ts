import { NextResponse } from "next/server"
import { getDailyChallenge, getGameContent } from "@/lib/game-content-store"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const [content, daily] = await Promise.all([getGameContent(), getDailyChallenge()])
    return NextResponse.json({ ...content, daily, serverTime: Date.now() }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("Error cargando contenido de juegos", error)
    return NextResponse.json({ error: "No se pudo actualizar el catálogo de juegos." }, { status: 503 })
  }
}
