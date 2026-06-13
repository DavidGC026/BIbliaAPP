import type { RowDataPacket, ResultSetHeader } from "mysql2"
import { emitNotification } from "./notification-bus"
import { ensureGroupTables } from "./groups"
import { getPool } from "./mysql"

export async function ensurePrayerTables(): Promise<void> {
  await ensureGroupTables()
  const pool = getPool()

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bible_prayer_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      status ENUM('active', 'answered', 'archived') DEFAULT 'active',
      visibility ENUM('private', 'group') DEFAULT 'private',
      group_id INT DEFAULT NULL,
      answered_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES bible_groups(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  try {
    await pool.query(
      `ALTER TABLE bible_prayer_requests ADD COLUMN visibility ENUM('private', 'group') DEFAULT 'private'`,
    )
  } catch (_) {}
  try {
    await pool.query(`ALTER TABLE bible_prayer_requests ADD COLUMN group_id INT DEFAULT NULL`)
  } catch (_) {}
  try {
    await pool.query(
      `ALTER TABLE bible_prayer_requests ADD COLUMN answered_at TIMESTAMP NULL DEFAULT NULL`,
    )
  } catch (_) {}
  try {
    await pool.query(
      `ALTER TABLE feed_notifications MODIFY COLUMN type ENUM('comment','reply','like','follow','prayer_intercession') NOT NULL`,
    )
  } catch (_) {}

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bible_prayer_intercessors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      prayer_id INT NOT NULL,
      user_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_prayer_user (prayer_id, user_id),
      FOREIGN KEY (prayer_id) REFERENCES bible_prayer_requests(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
}

export async function listUserPrayers(userId: number) {
  await ensurePrayerTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT * FROM bible_prayer_requests WHERE user_id = ? ORDER BY created_at DESC`,
    [userId],
  )
  return rows
}

export async function listGroupPrayers(groupId: number, userId: number) {
  await ensurePrayerTables()
  const [member] = await getPool().query<RowDataPacket[]>(
    `SELECT id FROM bible_group_members WHERE group_id = ? AND user_id = ? LIMIT 1`,
    [groupId, userId],
  )
  if (!member[0]) throw new Error("No eres miembro de este grupo")

  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT p.*, u.name AS user_name, u.username AS user_username,
            (SELECT COUNT(*) FROM bible_prayer_intercessors pi WHERE pi.prayer_id = p.id) AS intercessor_count,
            EXISTS(SELECT 1 FROM bible_prayer_intercessors pi WHERE pi.prayer_id = p.id AND pi.user_id = ?) AS is_interceding
     FROM bible_prayer_requests p
     JOIN users u ON p.user_id = u.id
     WHERE p.visibility = 'group' AND p.group_id = ? AND p.status = 'active'
     ORDER BY p.created_at DESC`,
    [userId, groupId],
  )
  return rows
}

export async function createPrayer(
  userId: number,
  title: string,
  description: string,
  visibility: "private" | "group" = "private",
  groupId?: number | null,
) {
  await ensurePrayerTables()

  if (visibility === "group") {
    if (!groupId) throw new Error("Debes seleccionar un grupo")
    const [member] = await getPool().query<RowDataPacket[]>(
      `SELECT id FROM bible_group_members WHERE group_id = ? AND user_id = ? LIMIT 1`,
      [groupId, userId],
    )
    if (!member[0]) throw new Error("No eres miembro de ese grupo")
  }

  const [result] = await getPool().query<ResultSetHeader>(
    `INSERT INTO bible_prayer_requests (user_id, title, description, status, visibility, group_id)
     VALUES (?, ?, ?, 'active', ?, ?)`,
    [userId, title, description || "", visibility, visibility === "group" ? groupId : null],
  )
  return result.insertId
}

export async function updatePrayerStatus(
  userId: number,
  id: number,
  status: string,
): Promise<void> {
  await ensurePrayerTables()
  const answeredAt = status === "answered" ? new Date() : null
  const [result] = await getPool().query<ResultSetHeader>(
    `UPDATE bible_prayer_requests SET status = ?, answered_at = ? WHERE id = ? AND user_id = ?`,
    [status, answeredAt, id, userId],
  )
  if (result.affectedRows === 0) throw new Error("Petición no encontrada o no autorizada")
}

export async function deletePrayer(userId: number, id: number): Promise<void> {
  await ensurePrayerTables()
  const [result] = await getPool().query<ResultSetHeader>(
    `DELETE FROM bible_prayer_requests WHERE id = ? AND user_id = ?`,
    [id, userId],
  )
  if (result.affectedRows === 0) throw new Error("Petición no encontrada o no autorizada")
}

export async function joinPrayerIntercession(
  prayerId: number,
  userId: number,
): Promise<{ intercessorCount: number }> {
  await ensurePrayerTables()
  const pool = getPool()

  const [prayer] = await pool.query<RowDataPacket[]>(
    `SELECT p.id, p.user_id, p.title, p.visibility, p.group_id
     FROM bible_prayer_requests p WHERE p.id = ? AND p.status = 'active' LIMIT 1`,
    [prayerId],
  )
  if (!prayer[0]) throw new Error("Petición no encontrada")

  if (prayer[0].visibility === "group" && prayer[0].group_id) {
    const [member] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM bible_group_members WHERE group_id = ? AND user_id = ? LIMIT 1`,
      [prayer[0].group_id, userId],
    )
    if (!member[0]) throw new Error("No tienes acceso a esta petición")
  } else if (prayer[0].user_id !== userId) {
    throw new Error("Esta petición es privada")
  }

  try {
    await pool.query(
      `INSERT INTO bible_prayer_intercessors (prayer_id, user_id) VALUES (?, ?)`,
      [prayerId, userId],
    )
  } catch {
    // ya intercede
  }

  const [[{ count }]] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS count FROM bible_prayer_intercessors WHERE prayer_id = ?`,
    [prayerId],
  )

  const authorId = prayer[0].user_id as number
  if (authorId !== userId) {
    const [actor] = await pool.query<RowDataPacket[]>(
      `SELECT name FROM users WHERE id = ? LIMIT 1`,
      [userId],
    )
    const actorName = (actor[0]?.name as string) || "Alguien"
    try {
      await pool.query(
        `INSERT INTO feed_notifications (user_id, actor_id, type) VALUES (?, ?, 'prayer_intercession')`,
        [authorId, userId],
      )
    } catch (_) {}
    emitNotification(authorId, {
      type: "prayer_intercession",
      actorName,
    })
  }

  return { intercessorCount: Number(count) }
}
