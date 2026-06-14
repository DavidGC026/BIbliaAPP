import type { RowDataPacket, ResultSetHeader } from "mysql2"
import type { AvatarVisibility } from "./avatar-visibility"
import { getPool } from "./mysql"
import { runOnce } from "./once-async"

export type { AvatarVisibility } from "./avatar-visibility"
export { AVATAR_VISIBILITY_LABELS, AVATAR_VISIBILITY_DESCRIPTIONS } from "./avatar-visibility"

export type MediaKind = "avatar" | "group" | "church_logo" | "other"

export async function ensureUserMediaTables(): Promise<void> {
  return runOnce("ensureUserMediaTables", _ensureUserMediaTables)
}

async function _ensureUserMediaTables(): Promise<void> {
  const pool = getPool()
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN avatar_media_id INT DEFAULT NULL`)
  } catch (_) {}
  try {
    await pool.query(
      `ALTER TABLE users ADD COLUMN avatar_visibility VARCHAR(20) DEFAULT 'groups'`,
    )
  } catch (_) {}

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_media (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      filename VARCHAR(255) NOT NULL,
      mime_type VARCHAR(100) DEFAULT NULL,
      visibility VARCHAR(20) DEFAULT 'groups',
      kind VARCHAR(20) DEFAULT 'other',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      KEY idx_user_kind (user_id, kind)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
}

export async function createUserMedia(
  userId: number,
  filename: string,
  mimeType: string,
  kind: MediaKind,
  visibility: AvatarVisibility = "groups",
): Promise<number> {
  await ensureUserMediaTables()
  const [result] = await getPool().query<ResultSetHeader>(
    `INSERT INTO user_media (user_id, filename, mime_type, visibility, kind) VALUES (?, ?, ?, ?, ?)`,
    [userId, filename, mimeType, visibility, kind],
  )
  return result.insertId
}

export async function getUserMediaById(id: number) {
  await ensureUserMediaTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT id, user_id, filename, mime_type, visibility, kind FROM user_media WHERE id = ? LIMIT 1`,
    [id],
  )
  return rows[0] || null
}

export async function getUserMediaByFilename(filename: string) {
  await ensureUserMediaTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT id, user_id, filename, mime_type, visibility, kind FROM user_media WHERE filename = ? LIMIT 1`,
    [filename],
  )
  return rows[0] || null
}

export async function setUserAvatar(userId: number, mediaId: number): Promise<void> {
  await ensureUserMediaTables()
  await getPool().query(`UPDATE users SET avatar_media_id = ? WHERE id = ?`, [mediaId, userId])
}

export async function getUserAvatarInfo(userId: number) {
  await ensureUserMediaTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT u.avatar_media_id, u.avatar_visibility, m.filename, m.id AS media_id
     FROM users u
     LEFT JOIN user_media m ON u.avatar_media_id = m.id
     WHERE u.id = ? LIMIT 1`,
    [userId],
  )
  return rows[0] || null
}
