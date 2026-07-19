import { NextResponse } from "next/server"
import { listAccessibleBibles } from "@/lib/bible-access"

export async function GET(req: Request) {
  try {
    const bibles = await listAccessibleBibles(req)
    const configuredDefault = Number(process.env.DEFAULT_PUBLIC_BIBLE_ID)
    const defaultBibleId = bibles.some((bible) => bible.bibleId === configuredDefault)
      ? configuredDefault
      : (bibles[0]?.bibleId ?? null)
    return NextResponse.json({ bibles, defaultBibleId })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}
