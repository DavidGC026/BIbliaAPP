import { type NextRequest, NextResponse } from "next/server"
import { getVerses } from "@/lib/bible"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const bookId = Number(searchParams.get("book"))
    const chapter = Number(searchParams.get("chapter"))
    if (!bookId || !chapter) {
      return NextResponse.json({ error: "Parámetros 'book' y 'chapter' requeridos." }, { status: 400 })
    }
    const verses = await getVerses(bookId, chapter)
    return NextResponse.json({ verses })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}
