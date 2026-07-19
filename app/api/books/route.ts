import { type NextRequest, NextResponse } from "next/server"
import { listBooks } from "@/lib/bible"
import { assertBibleAccess, bibleAccessStatus } from "@/lib/bible-access"
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const bibleId = Number(searchParams.get("bible"))
    if (!bibleId) {
      return NextResponse.json({ error: "Parámetro 'bible' requerido." }, { status: 400 })
    }
    await assertBibleAccess(req, bibleId)
    const books = await listBooks(bibleId)
    return NextResponse.json({ books })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: bibleAccessStatus(err) },
    )
  }
}
