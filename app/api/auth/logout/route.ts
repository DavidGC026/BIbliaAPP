import { NextResponse } from "next/server"
import { sessionCookieFlags } from "@/lib/auth"

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.headers.append("Set-Cookie", `session=; ${sessionCookieFlags()}; Max-Age=0`)
  return response
}
