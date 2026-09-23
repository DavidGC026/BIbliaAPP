import crypto from "crypto"
import { createStoredSession, readStoredSession, deleteStoredSession } from "./auth-session-store"

function getSecret(): string {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32) return process.env.JWT_SECRET
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET independiente de al menos 32 caracteres es obligatorio en producción.")
  }
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET
  return "bibliaapp-dev-only-secret"
}

export interface UserSession {
  userId: number
  role: string
}

interface SessionClaims extends UserSession {
  sid: string
  iat: number
  exp: number
  startedAt: number
}

export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000
const ABSOLUTE_SESSION_AGE_MS = 30 * 24 * 60 * 60 * 1000
const RENEW_AFTER_MS = 24 * 60 * 60 * 1000
const TOKEN_CONTEXT = Buffer.from("bibliaapp-session-v2")
let cachedSecret: string | undefined
let cachedKey: Buffer | undefined

function deriveKey(): Buffer {
  const secret = getSecret()
  if (secret !== cachedSecret || !cachedKey) {
    cachedKey = crypto.scryptSync(secret, TOKEN_CONTEXT, 32)
    cachedSecret = secret
  }
  return cachedKey
}

function validIdentity(payload: UserSession): boolean {
  return Number.isSafeInteger(payload.userId) && payload.userId > 0 &&
    typeof payload.role === "string" && /^[a-z][a-z0-9_-]{0,63}$/i.test(payload.role)
}

function issueToken(payload: UserSession, startedAt: number, sid = generateSecureToken()): string {
  if (!validIdentity(payload)) throw new Error("Identidad de sesión inválida.")
  const now = Date.now()
  const claims: SessionClaims = {
    userId: payload.userId,
    role: payload.role,
    sid,
    iat: now,
    exp: Math.min(now + SESSION_MAX_AGE_MS, startedAt + ABSOLUTE_SESSION_AGE_MS),
    startedAt,
  }
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", deriveKey(), iv)
  cipher.setAAD(TOKEN_CONTEXT)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(claims), "utf8"), cipher.final()])
  return `v2:${iv.toString("hex")}:${encrypted.toString("hex")}:${cipher.getAuthTag().toString("hex")}`
}

/** AES-GCM autentica también el IV: los tokens CBC anteriores no son seguros. */
export function generateToken(payload: UserSession): string {
  return issueToken(payload, Date.now())
}

/** Única entrada de login: registra una familia revocable antes de entregar el token. */
export async function createSessionToken(userId: number, expectedPassword?: string): Promise<string> {
  const startedAt = Date.now()
  const sid = generateSecureToken()
  const identity = await createStoredSession(sid, userId, startedAt + ABSOLUTE_SESSION_AGE_MS, expectedPassword)
  return issueToken(identity, startedAt, sid)
}

function verifyClaims(token: string): SessionClaims | null {
  if (typeof token !== "string" || token.length > 2048 ||
      !/^v2:[a-f0-9]{24}:(?:[a-f0-9]{2})+:[a-f0-9]{32}$/.test(token)) return null
  const key = deriveKey()
  try {
    const [, iv, encrypted, tag] = token.split(":")
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "hex"))
    decipher.setAAD(TOKEN_CONTEXT)
    decipher.setAuthTag(Buffer.from(tag, "hex"))
    const decoded = Buffer.concat([decipher.update(Buffer.from(encrypted, "hex")), decipher.final()])
    const payload: SessionClaims = JSON.parse(decoded.toString("utf8"))
    const now = Date.now()
    if (!payload || !validIdentity(payload) ||
        typeof payload.sid !== "string" || !/^[a-f0-9]{64}$/.test(payload.sid) ||
        !Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.exp) ||
        !Number.isSafeInteger(payload.startedAt) || payload.startedAt <= 0 ||
        payload.startedAt > payload.iat || payload.iat > now ||
        payload.exp <= now || payload.exp <= payload.iat ||
        payload.exp > payload.iat + SESSION_MAX_AGE_MS ||
        payload.exp > payload.startedAt + ABSOLUTE_SESSION_AGE_MS) return null
    return payload
  } catch {
    return null
  }
}

export function verifyToken(token: string): UserSession | null {
  const payload = verifyClaims(token)
  return payload ? { userId: payload.userId, role: payload.role } : null
}

/** Usar después de getSession; conserva la familia revocable y el límite del login. */
export function renewSessionToken(req: Request, user: UserSession): string | null {
  const token = getRequestToken(req)
  const claims = token ? verifyClaims(token) : null
  if (!claims || claims.userId !== user.userId) return null
  if (Date.now() - claims.iat < RENEW_AFTER_MS && claims.role === user.role) return null
  return issueToken(user, claims.startedAt, claims.sid)
}

const LEGACY_SALT = "biblia-salt-2026"

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex")
  const hash = crypto.scryptSync(password, salt, 32).toString("hex")
  return `scrypt$${salt}$${hash}`
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false

  if (storedHash.startsWith("scrypt$")) {
    const [, salt, hash] = storedHash.split("$")
    if (!salt || !hash) return false
    const candidate = crypto.scryptSync(password, salt, 32).toString("hex")
    return safeEqual(candidate, hash)
  }

  const legacyCandidates = [
    crypto.createHmac("sha256", LEGACY_SALT).update(password).digest("hex"),
    crypto.createHash("sha256").update(password + LEGACY_SALT).digest("hex"),
    crypto.createHash("sha256").update(LEGACY_SALT + password).digest("hex"),
    crypto.createHash("sha256").update(password).digest("hex"),
  ]
  return legacyCandidates.some((candidate) => safeEqual(candidate, storedHash))
}

export function needsRehash(storedHash: string): boolean {
  return !storedHash.startsWith("scrypt$")
}

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

export { getAppUrl } from "./app-url"

export function getRequestToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== null) {
    const bearer = /^Bearer ([^\s]+)$/i.exec(authHeader)
    return bearer?.[1] ?? null
  }
  const match = /(?:^|;\s*)session=([^;]+)/.exec(req.headers.get("cookie") ?? "")
  return match?.[1] ?? null
}

export async function getSession(req: Request): Promise<UserSession | null> {
  const token = getRequestToken(req)
  const claims = token ? verifyClaims(token) : null
  return claims ? readStoredSession(claims.sid, claims.userId) : null
}

export async function revokeSession(req: Request): Promise<void> {
  const token = getRequestToken(req)
  const claims = token ? verifyClaims(token) : null
  if (claims) await deleteStoredSession(claims.sid)
}

export function sessionCookieFlags(): string {
  const base = "Path=/; HttpOnly; SameSite=Lax"
  const isSecure =
    process.env.NODE_ENV === "production" ||
    process.env.APP_URL?.startsWith("https://") ||
    process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://")
  return isSecure ? `${base}; Secure` : base
}
