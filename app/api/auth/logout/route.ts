import { NextResponse } from "next/server"
import { revokeSession, sessionCookieFlags } from "@/lib/auth"

export async function POST(req: Request) {
  let response: NextResponse
  try {
    await revokeSession(req)
    response = NextResponse.json({ success: true })
  } catch (error) {
    console.error("No se pudo revocar la sesión", error)
    response = NextResponse.json({ error: "No se pudo cerrar la sesión en el servidor. Reintenta." }, { status: 503 })
  }
  response.headers.set("Cache-Control", "private, no-store")
  response.headers.append("Set-Cookie", `session=; ${sessionCookieFlags()}; Max-Age=0`)
  return response
}
