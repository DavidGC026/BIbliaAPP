import { createHash } from "node:crypto"
import type { RowDataPacket } from "mysql2"
import { getPool } from "./mysql"
import { runOnce } from "./once-async"

const fingerprint = (passwordHash: string) => createHash("sha256").update(passwordHash).digest("hex")

async function ensureSessions(): Promise<void> {
  return runOnce("auth-sessions-v1", async () => {
    await getPool().query(`CREATE TABLE IF NOT EXISTS auth_sessions (
      id CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
      user_id INT NOT NULL,
      password_fingerprint CHAR(64) CHARACTER SET ascii NOT NULL,
      expires_at BIGINT NOT NULL,
      KEY idx_auth_session_user (user_id), KEY idx_auth_session_expiry (expires_at)
    ) ENGINE=InnoDB`)
  })
}

export async function createStoredSession(id: string, userId: number, expiresAt: number, expectedPassword?: string) {
  await ensureSessions()
  const [users] = await getPool().query<RowDataPacket[]>("SELECT id, role, password FROM users WHERE id = ?", [userId])
  const user = users[0]
  if (!user || (expectedPassword !== undefined && user.password !== expectedPassword)) {
    throw new Error("Las credenciales cambiaron. Vuelve a iniciar sesión.")
  }
  await getPool().query("INSERT INTO auth_sessions (id, user_id, password_fingerprint, expires_at) VALUES (?, ?, ?, ?)",
    [id, userId, fingerprint(user.password), expiresAt])
  await getPool().query("DELETE FROM auth_sessions WHERE expires_at <= ? LIMIT 100", [Date.now()])
  return { userId: Number(user.id), role: String(user.role) }
}

/** La contraseña y el rol vigentes se consultan en cada petición, sin caché. */
export async function readStoredSession(id: string, userId: number) {
  await ensureSessions()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT u.id, u.role, u.password, s.password_fingerprint FROM auth_sessions s
     INNER JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.user_id = ? AND s.expires_at > ?`,
    [id, userId, Date.now()],
  )
  const row = rows[0]
  if (!row || fingerprint(row.password) !== row.password_fingerprint) return null
  return { userId: Number(row.id), role: String(row.role) }
}

export async function deleteStoredSession(id: string): Promise<void> {
  await ensureSessions()
  await getPool().query("DELETE FROM auth_sessions WHERE id = ?", [id])
}
