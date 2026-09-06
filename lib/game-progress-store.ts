import type { ResultSetHeader, RowDataPacket } from "mysql2/promise"
import { getPool } from "./mysql"
import { runOnce } from "./once-async"
import { applyOperation, emptyAccount, parseAccount, type ProgressOperation, type ProgressSyncReply } from "./games/sync"

export function ensureGameProgressTables() {
  return runOnce("game-progress-v3", async () => {
    const pool = getPool()
    await pool.query(`CREATE TABLE IF NOT EXISTS bible_game_progress (
      user_id BIGINT UNSIGNED PRIMARY KEY, progress LONGTEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)
    await pool.query(`CREATE TABLE IF NOT EXISTS bible_game_operations (
      user_id BIGINT UNSIGNED NOT NULL, operation_id VARCHAR(150) NOT NULL,
      received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, operation_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)
  })
}
export async function synchronizeGameProgress(userId: number, operations: ProgressOperation[]): Promise<ProgressSyncReply> {
  await ensureGameProgressTables()
  const connection = await getPool().getConnection()
  try {
    await connection.beginTransaction()
    await connection.query("INSERT IGNORE INTO bible_game_progress (user_id, progress) VALUES (?, ?)", [userId, JSON.stringify(emptyAccount())])
    const [rows] = await connection.query<RowDataPacket[]>("SELECT progress FROM bible_game_progress WHERE user_id = ? FOR UPDATE", [userId])
    let progress = parseAccount(JSON.parse(rows[0].progress))
    const now = Date.now()
    for (const original of operations) {
      const [receipt] = await connection.query<ResultSetHeader>("INSERT IGNORE INTO bible_game_operations (user_id, operation_id) VALUES (?, ?)", [userId, original.id])
      if (!receipt.affectedRows) continue
      // El reloj de un cliente adelantado no puede bloquear guardados futuros.
      const operation = { ...original, at: Math.min(original.at, now) }
      if (operation.type === "start" || operation.type === "save") operation.round = { ...operation.round, createdAt: Math.min(operation.round.createdAt, now), updatedAt: Math.min(operation.round.updatedAt, now) }
      progress = applyOperation(progress, operation, now)
    }
    await connection.query("UPDATE bible_game_progress SET progress = ? WHERE user_id = ?", [JSON.stringify(progress), userId])
    await connection.commit()
    return { progress, acknowledged: operations.map(operation => operation.id), serverTime: now }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally { connection.release() }
}
