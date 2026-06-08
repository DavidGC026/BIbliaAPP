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

export function hashPassword(password: string): string {
  // Simple hashing using SHA-256 with salt for native zero-dependency setup
  const salt = "biblia-salt-2026"
  return crypto.createHmac("sha256", salt).update(password).digest("hex")
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
