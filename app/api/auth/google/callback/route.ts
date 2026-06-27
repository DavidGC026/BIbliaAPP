import { type NextRequest, NextResponse } from "next/server"
import { generateToken, getAppUrl, sessionCookieFlags } from "@/lib/auth"
import {
  authenticateGoogleProfile,
  exchangeGoogleCode,
  GOOGLE_OAUTH_STATE_COOKIE,
  MOBILE_GOOGLE_REDIRECT,
  parseGoogleOAuthPlatform,
} from "@/lib/google-oauth"

function authErrorRedirect(message: string, platform: "web" | "mobile"): NextResponse {
  if (platform === "mobile") {
    const url = new URL(MOBILE_GOOGLE_REDIRECT)
    url.searchParams.set("error", message)
    return NextResponse.redirect(url.toString())
  }
  const url = new URL("/auth/google/complete", getAppUrl())
  url.searchParams.set("error", message)
  return NextResponse.redirect(url.toString())
}

function authSuccessRedirect(
  token: string,
  platform: "web" | "mobile",
  linkedExistingAccount = false,
): NextResponse {
  if (platform === "mobile") {
    const url = new URL(MOBILE_GOOGLE_REDIRECT)
    url.searchParams.set("token", token)
    if (linkedExistingAccount) url.searchParams.set("linked", "1")
    const response = NextResponse.redirect(url.toString())
    response.headers.append(
      "Set-Cookie",
      `${GOOGLE_OAUTH_STATE_COOKIE}=; ${sessionCookieFlags()}; Max-Age=0`,
    )
    return response
  }

  const url = new URL("/auth/google/complete", getAppUrl())
  if (linkedExistingAccount) url.searchParams.set("linked", "1")
  const response = NextResponse.redirect(url.toString())
  const secure =
    process.env.NODE_ENV === "production" ||
    process.env.APP_URL?.startsWith("https://") ||
    process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://")
  const secureFlag = secure ? "; Secure" : ""
  response.headers.append(
    "Set-Cookie",
    `session=${token}; ${sessionCookieFlags()}; Max-Age=${7 * 24 * 60 * 60}`,
  )
  response.headers.append(
    "Set-Cookie",
    `biblia_oauth_token=${encodeURIComponent(token)}; Path=/; SameSite=Lax; Max-Age=60${secureFlag}`,
  )
  response.headers.append(
    "Set-Cookie",
    `${GOOGLE_OAUTH_STATE_COOKIE}=; ${sessionCookieFlags()}; Max-Age=0`,
  )
  return response
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const state = searchParams.get("state")
  const platform = parseGoogleOAuthPlatform(state)

  try {
    const error = searchParams.get("error")
    if (error) {
      return authErrorRedirect("Inicio de sesión con Google cancelado.", platform)
    }

    const code = searchParams.get("code")
    if (!code || !state) {
      return authErrorRedirect("Respuesta de Google incompleta.", platform)
    }

    const cookieHeader = req.headers.get("cookie") || ""
    const stateMatch = cookieHeader.match(new RegExp(`${GOOGLE_OAUTH_STATE_COOKIE}=([^;]+)`))
    const savedState = stateMatch?.[1]
    if (!savedState || savedState !== state) {
      return authErrorRedirect("Sesión OAuth inválida. Inténtalo de nuevo.", platform)
    }

    const profile = await exchangeGoogleCode(code)
    const user = await authenticateGoogleProfile(profile)
    const token = generateToken({ userId: user.id, role: user.role })
    return authSuccessRedirect(token, platform, user.linkedExistingAccount)
  } catch (err) {
    return authErrorRedirect(
      err instanceof Error ? err.message : "Error al iniciar sesión con Google",
      platform,
    )
  }
}
