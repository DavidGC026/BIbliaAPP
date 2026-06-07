import { type NextRequest, NextResponse } from "next/server"
import { searchVerses } from "@/lib/bible"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const bibleId = Number(searchParams.get("bible"))
    const q = searchParams.get("q")?.trim()
    if (!bibleId) {
      return NextResponse.json(
        { error: "El parámetro 'bible' es requerido." },
        { status: 400 },
      )
    }
    if (!q || q.length < 2) {
      return NextResponse.json(
        { error: "El parámetro 'q' debe tener al menos 2 caracteres." },
        { status: 400 },
      )
    }
    const verses = await searchVerses(bibleId, q, 150)
    return NextResponse.json({ verses, total: verses.length })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}
