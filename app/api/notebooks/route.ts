import { type NextRequest, NextResponse } from "next/server"
import { listNotebooks, createNotebook } from "@/lib/bible"

export async function GET() {
  try {
    const notebooks = await listNotebooks()
    return NextResponse.json({ notebooks })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json()
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 })
    }
    const id = await createNotebook(name.trim())
    return NextResponse.json({ id, name: name.trim() })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}
