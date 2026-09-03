import type { RowDataPacket, ResultSetHeader } from "mysql2"
import { getPool } from "./mysql"
import { runOnce } from "./once-async"

export type ReportTargetType = "post" | "comment" | "user"
export type ReportStatus = "pending" | "resolved" | "dismissed"
export type ReportReason =
  | "spam"
  | "harassment"
  | "hate_speech"
  | "inappropriate"
  | "violence"
  | "false_information"
  | "other"

export interface ReportItem {
  id: number
  reporter_id: number
  reporter_name?: string
  reporter_username?: string
  target_type: ReportTargetType
  target_id: number
  reason: ReportReason
  details: string | null
  status: ReportStatus
  action_taken: string | null
  resolved_by: number | null
  resolved_at: string | null
  created_at: string
  // Datos del contenido denunciado
  target_content?: string | null
  target_author_id?: number | null
  target_author_name?: string | null
  target_author_username?: string | null
}

export interface BlockedUserItem {
  id: number
  name: string
  username: string
  avatar_media_id: number | null
  blocked_at: string
}

export async function ensureModerationTables(): Promise<void> {
  return runOnce("ensureModerationTables", _ensureModerationTables)
}

async function _ensureModerationTables(): Promise<void> {
  const pool = getPool()

  // 1. Tabla de denuncias / reportes
  await pool.query(`
    CREATE TABLE IF NOT EXISTS feed_reports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      reporter_id INT NOT NULL,
      target_type ENUM('post', 'comment', 'user') NOT NULL,
      target_id INT NOT NULL,
      reason VARCHAR(50) NOT NULL,
      details TEXT DEFAULT NULL,
      status ENUM('pending', 'resolved', 'dismissed') DEFAULT 'pending',
      action_taken VARCHAR(100) DEFAULT NULL,
      resolved_by INT DEFAULT NULL,
      resolved_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
      KEY idx_report_status (status),
      KEY idx_report_target (target_type, target_id),
      KEY idx_reporter (reporter_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  // 2. Tabla de usuarios bloqueados
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_blocks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      blocker_id INT NOT NULL,
      blocked_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_block (blocker_id, blocked_id),
      FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE,
      KEY idx_blocker (blocker_id),
      KEY idx_blocked (blocked_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
}

// ----------------------------------------------------------------------------
// DENUNCIAS / REPORTES (UGC)
// ----------------------------------------------------------------------------

export async function createReport(
  reporterId: number,
  targetType: ReportTargetType,
  targetId: number,
  reason: ReportReason,
  details?: string | null,
): Promise<number> {
  await ensureModerationTables()
  const pool = getPool()

  // Evitar reportes duplicados pendientes del mismo usuario para el mismo recurso
  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM feed_reports WHERE reporter_id = ? AND target_type = ? AND target_id = ? AND status = 'pending' LIMIT 1`,
    [reporterId, targetType, targetId],
  )
  if (existing.length > 0) {
    return existing[0].id as number
  }

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO feed_reports (reporter_id, target_type, target_id, reason, details)
     VALUES (?, ?, ?, ?, ?)`,
    [reporterId, targetType, targetId, reason, details || null],
  )
  return result.insertId
}

export async function listReports(
  status: ReportStatus | "all" = "pending",
  limit = 50,
  offset = 0,
): Promise<ReportItem[]> {
  await ensureModerationTables()
  const pool = getPool()

  const whereClause = status === "all" ? "" : "WHERE r.status = ?"
  const queryParams: (string | number)[] = status === "all" ? [limit, offset] : [status, limit, offset]

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT r.*,
            u.name AS reporter_name,
            u.username AS reporter_username
     FROM feed_reports r
     JOIN users u ON r.reporter_id = u.id
     ${whereClause}
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    queryParams,
  )

  // Enriquecer reportes con el contenido real
  const reports: ReportItem[] = []
  for (const row of rows) {
    const item = { ...row } as ReportItem
    try {
      if (item.target_type === "post") {
        const [postRows] = await pool.query<RowDataPacket[]>(
          `SELECT fp.content, fp.user_id, u.name as user_name, u.username as user_username
           FROM feed_posts fp
           JOIN users u ON fp.user_id = u.id
           WHERE fp.id = ?`,
          [item.target_id],
        )
        if (postRows.length > 0) {
          item.target_content = postRows[0].content
          item.target_author_id = postRows[0].user_id
          item.target_author_name = postRows[0].user_name
          item.target_author_username = postRows[0].user_username
        } else {
          item.target_content = "[Publicación eliminada]"
        }
      } else if (item.target_type === "comment") {
        const [commentRows] = await pool.query<RowDataPacket[]>(
          `SELECT fc.content, fc.user_id, fc.is_deleted, u.name as user_name, u.username as user_username
           FROM feed_comments fc
           JOIN users u ON fc.user_id = u.id
           WHERE fc.id = ?`,
          [item.target_id],
        )
        if (commentRows.length > 0) {
          item.target_content = commentRows[0].is_deleted ? "[Comentario eliminado]" : commentRows[0].content
          item.target_author_id = commentRows[0].user_id
          item.target_author_name = commentRows[0].user_name
          item.target_author_username = commentRows[0].user_username
        } else {
          item.target_content = "[Comentario eliminado]"
        }
      } else if (item.target_type === "user") {
        const [userRows] = await pool.query<RowDataPacket[]>(
          `SELECT id, name, username FROM users WHERE id = ?`,
          [item.target_id],
        )
        if (userRows.length > 0) {
          item.target_author_id = userRows[0].id
          item.target_author_name = userRows[0].name
          item.target_author_username = userRows[0].username
        }
      }
    } catch (_) {}
    reports.push(item)
  }

  return reports
}

export async function resolveReport(
  adminId: number,
  reportId: number,
  action: "dismiss" | "delete_content" | "suspend_user",
  notes?: string,
): Promise<void> {
  await ensureModerationTables()
  const pool = getPool()

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM feed_reports WHERE id = ? LIMIT 1`,
    [reportId],
  )
  if (rows.length === 0) throw new Error("Reporte no encontrado")
  const report = rows[0] as ReportItem

  if (action === "delete_content") {
    if (report.target_type === "post") {
      await pool.query(`DELETE FROM feed_posts WHERE id = ?`, [report.target_id])
    } else if (report.target_type === "comment") {
      await pool.query(`UPDATE feed_comments SET is_deleted = 1 WHERE id = ?`, [report.target_id])
    }
  }

  const newStatus: ReportStatus = action === "dismiss" ? "dismissed" : "resolved"
  await pool.query(
    `UPDATE feed_reports
     SET status = ?, action_taken = ?, resolved_by = ?, resolved_at = NOW()
     WHERE id = ?`,
    [newStatus, `${action}${notes ? `: ${notes}` : ""}`, adminId, reportId],
  )
}

// ----------------------------------------------------------------------------
// BLOQUEO DE USUARIOS
// ----------------------------------------------------------------------------

export async function blockUser(blockerId: number, blockedId: number): Promise<void> {
  if (blockerId === blockedId) {
    throw new Error("No puedes bloquearte a ti mismo.")
  }
  await ensureModerationTables()
  const pool = getPool()

  await pool.query(
    `INSERT IGNORE INTO user_blocks (blocker_id, blocked_id) VALUES (?, ?)`,
    [blockerId, blockedId],
  )

  // Deshacer seguidor mutuo y amistades al bloquear
  try {
    await pool.query(
      `DELETE FROM user_follows WHERE (follower_id = ? AND followed_id = ?) OR (follower_id = ? AND followed_id = ?)`,
      [blockerId, blockedId, blockedId, blockerId],
    )
  } catch (_) {}

  try {
    await pool.query(
      `DELETE FROM user_friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`,
      [blockerId, blockedId, blockedId, blockerId],
    )
  } catch (_) {}
}

export async function unblockUser(blockerId: number, blockedId: number): Promise<void> {
  await ensureModerationTables()
  await getPool().query(
    `DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?`,
    [blockerId, blockedId],
  )
}

export async function listBlockedUsers(userId: number): Promise<BlockedUserItem[]> {
  await ensureModerationTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT u.id, u.name, u.username, u.avatar_media_id, b.created_at AS blocked_at
     FROM user_blocks b
     JOIN users u ON b.blocked_id = u.id
     WHERE b.blocker_id = ?
     ORDER BY b.created_at DESC`,
    [userId],
  )
  return rows as BlockedUserItem[]
}

/**
 * Devuelve un conjunto de IDs con los que no debe haber interacción:
 * usuarios bloqueados por este usuario O usuarios que bloquearon a este usuario.
 */
export async function getBlockedUserIds(userId: number): Promise<number[]> {
  if (!userId) return []
  await ensureModerationTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT blocked_id AS uid FROM user_blocks WHERE blocker_id = ?
     UNION
     SELECT blocker_id AS uid FROM user_blocks WHERE blocked_id = ?`,
    [userId, userId],
  )
  return rows.map((r) => r.uid as number)
}

export async function isBlockedBidirectional(userA: number, userB: number): Promise<boolean> {
  if (!userA || !userB || userA === userB) return false
  await ensureModerationTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT 1 FROM user_blocks
     WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
     LIMIT 1`,
    [userA, userB, userB, userA],
  )
  return rows.length > 0
}
