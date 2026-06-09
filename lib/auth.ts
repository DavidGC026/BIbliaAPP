import crypto from "crypto"

const SECRET = process.env.JWT_SECRET || "bibliaapp-super-secret-key-2026"

export interface UserSession {
  userId: number
  role: string
}

export function generateToken(payload: UserSession): string {
  const data = JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }) // 7 days expiration
  const cipher = crypto.createCipheriv("aes-256-cbc", crypto.scryptSync(SECRET, "salt", 32), Buffer.alloc(16, 0))
  let encrypted = cipher.update(data, "utf8", "hex")
  encrypted += cipher.final("hex")
  return encrypted
}

export function verifyToken(token: string): UserSession | null {
  try {
    const decipher = crypto.createDecipheriv("aes-256-cbc", crypto.scryptSync(SECRET, "salt", 32), Buffer.alloc(16, 0))
    let decrypted = decipher.update(token, "hex", "utf8")
    decrypted += decipher.final("utf8")
    const payload = JSON.parse(decrypted)
    if (payload.exp < Date.now()) return null
    return {
      userId: payload.userId,
      role: payload.role,
    }
  } catch {
    return null
  }
}

const LEGACY_SALT = "biblia-salt-2026"

// Formato nuevo: scrypt$<salt-hex>$<hash-hex> (sal aleatoria por usuario)
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

/**
 * Verifica una contraseña contra el hash almacenado, aceptando tanto el
 * formato nuevo (scrypt) como los formatos antiguos (HMAC/SHA-256 con sal fija)
 * para no romper cuentas existentes.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false

  if (storedHash.startsWith("scrypt$")) {
    const [, salt, hash] = storedHash.split("$")
    if (!salt || !hash) return false
    const candidate = crypto.scryptSync(password, salt, 32).toString("hex")
    return safeEqual(candidate, hash)
  }

  // Formatos legados (64 hex): HMAC con sal fija y variantes SHA-256
  const legacyCandidates = [
    crypto.createHmac("sha256", LEGACY_SALT).update(password).digest("hex"),
    crypto.createHash("sha256").update(password + LEGACY_SALT).digest("hex"),
    crypto.createHash("sha256").update(LEGACY_SALT + password).digest("hex"),
    crypto.createHash("sha256").update(password).digest("hex"),
  ]
  return legacyCandidates.some((candidate) => safeEqual(candidate, storedHash))
}

/** Indica si el hash almacenado usa un formato legado y conviene re-hashear. */
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
  // Try cookie
  const cookieHeader = req.headers.get("cookie")
  if (cookieHeader) {
    const match = cookieHeader.match(/session=([^;]+)/)
    if (match) {
      return verifyToken(match[1])
    }
  }
  return null
}
