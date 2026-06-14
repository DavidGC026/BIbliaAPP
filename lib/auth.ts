import crypto from "crypto"

function getSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET
  if (process.env.NODE_ENV === "production") {
    const mysqlPassword = process.env.MYSQL_PASSWORD
    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL
    if (mysqlPassword && appUrl) {
      return crypto
        .createHash("sha256")
        .update(`jwt:${mysqlPassword}:${appUrl}`)
        .digest("hex")
    }
    throw new Error("JWT_SECRET es obligatorio en producción (o define MYSQL_PASSWORD y APP_URL).")
  }
  return "bibliaapp-dev-only-secret"
}

export interface UserSession {
  userId: number
  role: string
}

function deriveKey(): Buffer {
  return crypto.scryptSync(getSecret(), "salt", 32)
}

/** Formato nuevo: <iv-hex>:<ciphertext-hex> */
export function generateToken(payload: UserSession): string {
  const data = JSON.stringify({
    ...payload,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  })
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv("aes-256-cbc", deriveKey(), iv)
  let encrypted = cipher.update(data, "utf8", "hex")
  encrypted += cipher.final("hex")
  return `${iv.toString("hex")}:${encrypted}`
}

function verifyLegacyToken(token: string): UserSession | null {
  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      deriveKey(),
      Buffer.alloc(16, 0),
    )
    let decrypted = decipher.update(token, "hex", "utf8")
    decrypted += decipher.final("utf8")
    const payload = JSON.parse(decrypted)
    if (payload.exp < Date.now()) return null
    return { userId: payload.userId, role: payload.role }
  } catch {
    return null
  }
}

export function verifyToken(token: string): UserSession | null {
  try {
    if (token.includes(":")) {
      const [ivHex, encrypted] = token.split(":")
      if (!ivHex || !encrypted) return null
      const iv = Buffer.from(ivHex, "hex")
      if (iv.length !== 16) return null
      const decipher = crypto.createDecipheriv("aes-256-cbc", deriveKey(), iv)
      let decrypted = decipher.update(encrypted, "hex", "utf8")
      decrypted += decipher.final("utf8")
      const payload = JSON.parse(decrypted)
      if (payload.exp < Date.now()) return null
      return { userId: payload.userId, role: payload.role }
    }
    return verifyLegacyToken(token)
  } catch {
    return verifyLegacyToken(token)
  }
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

export function getAppUrl(fallbackOrigin?: string): string {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    fallbackOrigin ||
    "https://biblia2.dvguzman.com"
  ).replace(/\/$/, "")
}

export function getSession(req: Request): UserSession | null {
  const authHeader = req.headers.get("authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7)
    return verifyToken(token)
  }
  const cookieHeader = req.headers.get("cookie")
  if (cookieHeader) {
    const match = cookieHeader.match(/session=([^;]+)/)
    if (match) {
      return verifyToken(match[1])
    }
  }
  return null
}

export function sessionCookieFlags(): string {
  const base = "Path=/; HttpOnly; SameSite=Lax"
  const isSecure =
    process.env.NODE_ENV === "production" ||
    process.env.APP_URL?.startsWith("https://") ||
    process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://")
  return isSecure ? `${base}; Secure` : base
}
