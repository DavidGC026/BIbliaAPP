import { type NextRequest, NextResponse } from "next/server"
import { deleteNotebook } from "@/lib/bible"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const idNum = Number(id)
    if (isNaN(idNum)) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 })
    }
    await deleteNotebook(idNum)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}
