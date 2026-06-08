import { type NextRequest, NextResponse } from "next/server"
import { getUserById, updateUserStreak } from "@/lib/bible"
import { getSession } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ user: null })
    }

    await updateUserStreak(session.userId)
    const user = await getUserById(session.userId)
    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado." },
        { status: 404 }
      )
    }

    return NextResponse.json({ user })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error de autenticación" },
      { status: 500 }
    )
  }
}
