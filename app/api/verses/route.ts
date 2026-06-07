import { type NextRequest, NextResponse } from "next/server"
import { getVerses } from "@/lib/bible"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const bibleId = Number(searchParams.get("bible"))
    const bookId = Number(searchParams.get("book"))
    const chapter = Number(searchParams.get("chapter"))
    if (!bibleId || !bookId || !chapter) {
      return NextResponse.json({ error: "Parámetros 'bible', 'book' y 'chapter' requeridos." }, { status: 400 })
    }
    const verses = await getVerses(bibleId, bookId, chapter)
    return NextResponse.json({ verses })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}
