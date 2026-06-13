import { type NextRequest, NextResponse } from "next/server"
import { getGroupPreviewByInviteCode } from "@/lib/groups"

export async function GET(req: NextRequest) {
  try {
    const code = new URL(req.url).searchParams.get("code")?.trim().toUpperCase()
    if (!code || !/^[A-F0-9]{8}$/.test(code)) {
      return NextResponse.json({ error: "Código de invitación inválido" }, { status: 400 })
    }

    const group = await getGroupPreviewByInviteCode(code)
    if (!group) {
      return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ group })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}
