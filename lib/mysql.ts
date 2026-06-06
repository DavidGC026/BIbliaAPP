import mysql from "mysql2/promise"

let pool: mysql.Pool | null = null

/**
 * Returns a shared MySQL connection pool built from environment variables.
 * Throws a descriptive error if the required configuration is missing so the
 * API layer can surface a helpful message instead of crashing.
 */
export function getPool(): mysql.Pool {
  if (pool) return pool

  const { MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE } = process.env

  if (!MYSQL_HOST || !MYSQL_USER || !MYSQL_DATABASE) {
    throw new Error(
      "Faltan variables de entorno de MySQL (MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE).",
    )
  }

  pool = mysql.createPool({
    host: MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: MYSQL_USER,
    password: MYSQL_PASSWORD ?? "",
    database: MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    charset: "utf8mb4",
  })

  return pool
}

export async function pingMysql(): Promise<void> {
  const conn = await getPool().getConnection()
  try {
    await conn.query("SELECT 1")
  } finally {
    conn.release()
  }
}
