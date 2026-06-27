import crypto from "crypto"
import { getAppUrl, hashPassword } from "@/lib/auth"
import {
  createGoogleUser,
  getUserByEmail,
  getUserByGoogleId,
  linkUserGoogleId,
} from "@/lib/bible"

export const GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state"
export const MOBILE_GOOGLE_REDIRECT = "bibliaapp://auth/google"

export type GoogleOAuthPlatform = "web" | "mobile"

export function buildGoogleOAuthState(platform: GoogleOAuthPlatform): string {
  return `${platform}:${crypto.randomBytes(24).toString("hex")}`
}

export function parseGoogleOAuthPlatform(state: string | null): GoogleOAuthPlatform {
  if (state?.startsWith("mobile:")) return "mobile"
  return "web"
}

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET son obligatorios.")
  }
  return {
    clientId,
    clientSecret,
    redirectUri: `${getAppUrl()}/api/auth/google/callback`,
  }
}

export function buildGoogleAuthUrl(state: string): string {
  const { clientId, redirectUri } = getGoogleOAuthConfig()
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export interface GoogleUserInfo {
  id: string
  email: string
  verified_email: boolean
  name: string
  picture?: string
}

export async function exchangeGoogleCode(code: string): Promise<GoogleUserInfo> {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig()

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })

  const tokenData = await tokenRes.json()
  if (!tokenRes.ok) {
    throw new Error(tokenData.error_description || tokenData.error || "Error al intercambiar código OAuth")
  }

  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })

  const userInfo = await userRes.json()
  if (!userRes.ok) {
    throw new Error(userInfo.error?.message || "No se pudo obtener el perfil de Google")
  }

  return userInfo as GoogleUserInfo
}

export async function authenticateGoogleProfile(
  profile: GoogleUserInfo,
): Promise<{ id: number; name: string; email: string; role: string; linkedExistingAccount: boolean }> {
  if (!profile.email || !profile.verified_email) {
    throw new Error("Google no devolvió un correo verificado.")
  }

  const email = profile.email.trim().toLowerCase()
  const googleId = profile.id
  const name = profile.name?.trim() || email.split("@")[0]
  let linkedExistingAccount = false

  let user = await getUserByGoogleId(googleId)
  if (!user) {
    const existing = await getUserByEmail(email)
    if (existing) {
      if (existing.googleId && existing.googleId !== googleId) {
        throw new Error("Este correo ya está vinculado a otra cuenta de Google.")
      }
      if (!existing.googleId) {
        await linkUserGoogleId(existing.id, googleId)
        linkedExistingAccount = true
      }
      user = { ...existing, googleId, role: existing.role }
    } else {
      const passwordHash = hashPassword(crypto.randomBytes(32).toString("hex"))
      const userId = await createGoogleUser(name, email, googleId, passwordHash)
      user = { id: userId, name, email, role: "user" }
    }
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    linkedExistingAccount,
  }
}
