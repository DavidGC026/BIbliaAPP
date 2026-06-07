import { NextResponse } from "next/server"
import { listBibles } from "@/lib/bible"

export async function GET() {
  try {
    const bibles = await listBibles()
    return NextResponse.json({ bibles })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}
