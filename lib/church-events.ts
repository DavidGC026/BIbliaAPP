import type { RowDataPacket, ResultSetHeader } from "mysql2"
import { ensureDbTables } from "./bible"
import { getPool } from "./mysql"

export type EventCategory = "culto" | "oracion" | "jovenes" | "ministerio" | "otro"

export async function ensureChurchEventTables(): Promise<void> {
  await ensureDbTables()
  const pool = getPool()

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bible_church_events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      start_time DATETIME NOT NULL,
      end_time DATETIME DEFAULT NULL,
      location VARCHAR(255) DEFAULT NULL,
      category ENUM('culto', 'oracion', 'jovenes', 'ministerio', 'otro') DEFAULT 'otro',
      created_by INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
      KEY idx_start (start_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bible_event_rsvps (
      id INT AUTO_INCREMENT PRIMARY KEY,
      event_id INT NOT NULL,
      user_id INT NOT NULL,
      status ENUM('going', 'maybe', 'declined') DEFAULT 'going',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_event_user (event_id, user_id),
      FOREIGN KEY (event_id) REFERENCES bible_church_events(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
}

export async function listUpcomingEvents(limit = 30) {
  await ensureChurchEventTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT e.*, u.name AS creator_name,
            (SELECT COUNT(*) FROM bible_event_rsvps r WHERE r.event_id = e.id AND r.status = 'going') AS going_count
     FROM bible_church_events e
     JOIN users u ON e.created_by = u.id
     WHERE e.start_time >= DATE_SUB(NOW(), INTERVAL 1 DAY)
     ORDER BY e.start_time ASC
     LIMIT ?`,
    [limit],
  )
  return rows
}

export async function listEventsWithUserRsvp(userId: number, limit = 50) {
  await ensureChurchEventTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT e.*, u.name AS creator_name,
            (SELECT COUNT(*) FROM bible_event_rsvps r WHERE r.event_id = e.id AND r.status = 'going') AS going_count,
            (SELECT r.status FROM bible_event_rsvps r WHERE r.event_id = e.id AND r.user_id = ? LIMIT 1) AS my_rsvp
     FROM bible_church_events e
     JOIN users u ON e.created_by = u.id
     WHERE e.start_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
     ORDER BY e.start_time ASC
     LIMIT ?`,
    [userId, limit],
  )
  return rows
}

export async function createEvent(
  userId: number,
  data: {
    title: string
    description?: string
    startTime: string
    endTime?: string | null
    location?: string
    category?: EventCategory
  },
  isAdmin: boolean,
) {
  await ensureChurchEventTables()
  if (!isAdmin) throw new Error("Solo administradores pueden crear eventos")

  const [result] = await getPool().query<ResultSetHeader>(
    `INSERT INTO bible_church_events (title, description, start_time, end_time, location, category, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.title,
      data.description || "",
      data.startTime,
      data.endTime || null,
      data.location || "",
      data.category || "otro",
      userId,
    ],
  )
  return result.insertId
}

export async function setEventRsvp(
  eventId: number,
  userId: number,
  status: "going" | "maybe" | "declined",
): Promise<void> {
  await ensureChurchEventTables()
  await getPool().query(
    `INSERT INTO bible_event_rsvps (event_id, user_id, status) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE status = VALUES(status), updated_at = NOW()`,
    [eventId, userId, status],
  )
}

export async function deleteEvent(eventId: number, userId: number, isAdmin: boolean): Promise<void> {
  await ensureChurchEventTables()
  if (!isAdmin) throw new Error("Solo administradores pueden eliminar eventos")
  await getPool().query(`DELETE FROM bible_church_events WHERE id = ?`, [eventId])
}
