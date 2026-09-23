import { type NextRequest, NextResponse } from "next/server"
import { getUserById, updateUserStreak } from "@/lib/bible"
import { getSession, renewSessionToken, sessionCookieFlags, SESSION_MAX_AGE_SECONDS } from "@/lib/auth"
import { processGroupEventRemindersThrottled } from "@/lib/group-events"

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ user: null }, { headers: { "Cache-Control": "private, no-store" } })
    }

    processGroupEventRemindersThrottled().catch(() => {})
    updateUserStreak(session.userId).catch(() => {})
    const user = await getUserById(session.userId)
    if (!user) {
      return NextResponse.json(
        { error: "La sesión ya no es válida.", code: "SESSION_INVALID" },
        { status: 401, headers: { "Cache-Control": "private, no-store" } }
      )
    }

    const token = renewSessionToken(req, { userId: user.id, role: user.role })
    const response = NextResponse.json(
      { user, ...(token ? { token } : {}) },
      { headers: { "Cache-Control": "private, no-store" } },
    )
    if (token) {
      response.headers.append("Set-Cookie", `session=${token}; ${sessionCookieFlags()}; Max-Age=${SESSION_MAX_AGE_SECONDS}`)
    }
    return response
  } catch (err) {
    console.error("No se pudo validar la sesión", err)
    return NextResponse.json(
      { error: "No se pudo validar la sesión. Inténtalo de nuevo." },
      { status: 503, headers: { "Cache-Control": "private, no-store" } }
    )
  }
}
