import { type NextRequest, NextResponse } from "next/server"
import { sessionCookieFlags } from "@/lib/auth"
import {
  buildGoogleAuthUrl,
  buildGoogleOAuthState,
  GOOGLE_OAUTH_STATE_COOKIE,
  type GoogleOAuthPlatform,
} from "@/lib/google-oauth"

function parseDesktopPort(raw: string | null): number | undefined {
  const port = Number.parseInt(raw ?? "", 10)
  if (!Number.isFinite(port) || port < 1024 || port > 65535) return undefined
  return port
}

export async function GET(req: NextRequest) {
  try {
    const mobile = req.nextUrl.searchParams.get("mobile") === "1"
    const desktopPort = parseDesktopPort(req.nextUrl.searchParams.get("port"))

    let platform: GoogleOAuthPlatform = "web"
    if (desktopPort) platform = "desktop"
    else if (mobile) platform = "mobile"

    const state = buildGoogleOAuthState(platform, desktopPort)
    const response = NextResponse.redirect(buildGoogleAuthUrl(state))
    response.headers.append(
      "Set-Cookie",
      `${GOOGLE_OAUTH_STATE_COOKIE}=${state}; ${sessionCookieFlags()}; Max-Age=600`,
    )
    return response
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Google OAuth no configurado" },
      { status: 500 },
    )
  }
}
