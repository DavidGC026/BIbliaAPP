import { createHash } from "node:crypto"
import type { RowDataPacket } from "mysql2"
import { getPool } from "./mysql"
import { runOnce } from "./once-async"
import { RequestError } from "./request-security"

/** Compartido por todos los procesos: no se reinicia al desplegar ni confía en IPs enviadas por el cliente. */
export async function limitAuthAttempts(scope: string, subject: string, limit = 10, windowSeconds = 900): Promise<void> {
  await runOnce("auth-rate-limits-v1", async () => {
    await getPool().query(`CREATE TABLE IF NOT EXISTS auth_rate_limits (
      bucket CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
      attempts INT UNSIGNED NOT NULL, expires_at BIGINT NOT NULL, KEY idx_auth_limit_expiry (expires_at)
    ) ENGINE=InnoDB`)
  })
  const now = Date.now()
  const windowMs = windowSeconds * 1000
  const expires = (Math.floor(now / windowMs) + 1) * windowMs
  const bucket = createHash("sha256").update(`${scope}:${subject.toLowerCase()}:${expires}`).digest("hex")
  const connection = await getPool().getConnection()
  try {
    await connection.beginTransaction()
    await connection.query(`INSERT INTO auth_rate_limits (bucket, attempts, expires_at) VALUES (?, 1, ?)
      ON DUPLICATE KEY UPDATE attempts = LEAST(attempts + 1, ?)`, [bucket, expires, limit + 1])
    const [rows] = await connection.query<RowDataPacket[]>("SELECT attempts FROM auth_rate_limits WHERE bucket = ? FOR UPDATE", [bucket])
    await connection.commit()
    if (Number(rows[0].attempts) > limit) throw new RequestError("Demasiados intentos. Inténtalo más tarde.", 429, Math.max(1, Math.ceil((expires - now) / 1000)))
  } catch (error) {
    await connection.rollback()
    throw error
  } finally { connection.release() }
  await getPool().query("DELETE FROM auth_rate_limits WHERE expires_at <= ? LIMIT 100", [now])
}

export async function limitAccountAccess(req: Request, account: string, scope = "login", limit = 10): Promise<void> {
  // Solo configurar esta cabecera cuando el proxy la sobrescribe y el backend no es accesible directamente.
  const trustedHeader = process.env.AUTH_TRUSTED_IP_HEADER
  const client = trustedHeader ? req.headers.get(trustedHeader)?.trim().slice(0, 128) : undefined
  await limitAuthAttempts(`${scope}:source`, client || "global", client ? 100 : 1000)
  await limitAuthAttempts(`${scope}:account`, account, limit)
}
