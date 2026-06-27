import { type NextRequest, NextResponse } from "next/server"
import { sessionCookieFlags } from "@/lib/auth"
import {
  buildGoogleAuthUrl,
  buildGoogleOAuthState,
  GOOGLE_OAUTH_STATE_COOKIE,
  type GoogleOAuthPlatform,
} from "@/lib/google-oauth"

export async function GET(req: NextRequest) {
  try {
    const platform: GoogleOAuthPlatform =
      req.nextUrl.searchParams.get("mobile") === "1" ? "mobile" : "web"
    const state = buildGoogleOAuthState(platform)
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
