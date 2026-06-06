import { NextResponse } from "next/server"
import { listBooks } from "@/lib/bible"

export async function GET() {
  try {
    const books = await listBooks()
    return NextResponse.json({ books })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}
