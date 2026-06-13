import type { RowDataPacket, ResultSetHeader } from "mysql2"
import { emitNotification } from "./notification-bus"
import { assertGroupMember } from "./group-features"
import { ensureGroupTables } from "./groups"
import { canManageGroupEvents } from "./group-roles"
import { getPool } from "./mysql"
import { runOnce } from "./once-async"

export type GroupEventReminderKind = "1day" | "2hours"

const REMINDER_THROTTLE_MS = 60_000
const globalStore = globalThis as unknown as { __lastGroupReminderRun?: number }

export async function ensureGroupEventTables(): Promise<void> {
  return runOnce("ensureGroupEventTables", _ensureGroupEventTables)
}

async function _ensureGroupEventTables(): Promise<void> {
  await ensureGroupTables()
  const pool = getPool()

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bible_group_events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      group_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      image_url VARCHAR(500) DEFAULT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME DEFAULT NULL,
      location VARCHAR(255) DEFAULT NULL,
      created_by INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES bible_groups(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
      KEY idx_group_start (group_id, start_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bible_group_event_reminders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      event_id INT NOT NULL,
      user_id INT NOT NULL,
      kind ENUM('1day', '2hours') NOT NULL,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_event_user_kind (event_id, user_id, kind),
      FOREIGN KEY (event_id) REFERENCES bible_group_events(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  try {
    await pool.query(
      `ALTER TABLE feed_notifications ADD COLUMN group_event_id INT DEFAULT NULL`,
    )
  } catch (_) {}
  try {
    await pool.query(
      `ALTER TABLE feed_notifications ADD COLUMN reminder_kind VARCHAR(20) DEFAULT NULL`,
    )
  } catch (_) {}
  try {
    await pool.query(
      `ALTER TABLE feed_notifications MODIFY COLUMN type ENUM(
        'comment','reply','like','follow','prayer_intercession',
        'friend_request','friend_accepted','group_event_reminder'
      ) NOT NULL`,
    )
  } catch (_) {}
}

export async function listGroupEvents(groupId: number, userId: number) {
  await assertGroupMember(groupId, userId)
  await ensureGroupEventTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT e.*, u.name AS creator_name
     FROM bible_group_events e
     JOIN users u ON e.created_by = u.id
     WHERE e.group_id = ?
       AND e.start_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
     ORDER BY e.start_time ASC
     LIMIT 100`,
    [groupId],
  )
  return rows
}

/** Eventos de todos los grupos donde el usuario es miembro (para el calendario global). */
export async function listUserGroupEventsAcrossGroups(userId: number) {
  await ensureGroupEventTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT e.*, u.name AS creator_name, g.name AS group_name
     FROM bible_group_events e
     JOIN bible_group_members gm ON gm.group_id = e.group_id AND gm.user_id = ?
     JOIN bible_groups g ON g.id = e.group_id
     JOIN users u ON e.created_by = u.id
     WHERE e.start_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
     ORDER BY e.start_time ASC
     LIMIT 200`,
    [userId],
  )
  return rows
}

export async function createGroupEvent(
  groupId: number,
  userId: number,
  data: {
    title: string
    description?: string
    imageUrl?: string | null
    startTime: string
    endTime?: string | null
    location?: string
  },
) {
  const role = await assertGroupMember(groupId, userId)
  if (!canManageGroupEvents(role)) {
    throw new Error("Solo administradores, líderes o maestros pueden crear eventos")
  }
  await ensureGroupEventTables()

  const [result] = await getPool().query<ResultSetHeader>(
    `INSERT INTO bible_group_events
       (group_id, title, description, image_url, start_time, end_time, location, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      groupId,
      data.title.trim(),
      data.description || "",
      data.imageUrl || null,
      data.startTime,
      data.endTime || null,
      data.location || "",
      userId,
    ],
  )
  return result.insertId
}

export async function deleteGroupEvent(
  groupId: number,
  eventId: number,
  userId: number,
): Promise<void> {
  const role = await assertGroupMember(groupId, userId)
  if (!canManageGroupEvents(role)) {
    throw new Error("Solo administradores, líderes o maestros pueden eliminar eventos")
  }
  await ensureGroupEventTables()
  const [result] = await getPool().query<ResultSetHeader>(
    `DELETE FROM bible_group_events WHERE id = ? AND group_id = ?`,
    [eventId, groupId],
  )
  if (result.affectedRows === 0) throw new Error("Evento no encontrado")
}

async function listGroupMemberIds(groupId: number): Promise<number[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT user_id FROM bible_group_members WHERE group_id = ?`,
    [groupId],
  )
  return rows.map((r) => r.user_id as number)
}

async function sendReminderIfNeeded(
  event: RowDataPacket,
  userId: number,
  kind: GroupEventReminderKind,
): Promise<void> {
  const pool = getPool()
  const eventId = event.id as number
  const creatorId = event.created_by as number

  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM bible_group_event_reminders
     WHERE event_id = ? AND user_id = ? AND kind = ? LIMIT 1`,
    [eventId, userId, kind],
  )
  if (existing[0]) return

  try {
    await pool.query(
      `INSERT INTO bible_group_event_reminders (event_id, user_id, kind) VALUES (?, ?, ?)`,
      [eventId, userId, kind],
    )
  } catch {
    return
  }

  await pool.query(
    `INSERT INTO feed_notifications (user_id, actor_id, type, group_event_id, reminder_kind)
     VALUES (?, ?, 'group_event_reminder', ?, ?)`,
    [userId, creatorId, eventId, kind],
  )

  const groupName = event.group_name as string
  const title = event.title as string
  const label =
    kind === "1day"
      ? `Mañana: ${title} (${groupName})`
      : `En 2 horas: ${title} (${groupName})`

  emitNotification(userId, {
    type: "group_event_reminder",
    actorName: label,
    groupEventId: eventId,
    groupId: event.group_id as number,
    reminderKind: kind,
  })
}

export async function processGroupEventReminders(): Promise<void> {
  await ensureGroupEventTables()
  const pool = getPool()

  const [dayEvents] = await pool.query<RowDataPacket[]>(
    `SELECT e.*, g.name AS group_name
     FROM bible_group_events e
     JOIN bible_groups g ON e.group_id = g.id
     WHERE e.start_time BETWEEN DATE_ADD(NOW(), INTERVAL 23 HOUR) AND DATE_ADD(NOW(), INTERVAL 25 HOUR)`,
  )

  const [hourEvents] = await pool.query<RowDataPacket[]>(
    `SELECT e.*, g.name AS group_name
     FROM bible_group_events e
     JOIN bible_groups g ON e.group_id = g.id
     WHERE e.start_time BETWEEN DATE_ADD(NOW(), INTERVAL 90 MINUTE) AND DATE_ADD(NOW(), INTERVAL 150 MINUTE)`,
  )

  for (const event of dayEvents) {
    const members = await listGroupMemberIds(event.group_id as number)
    for (const memberId of members) {
      await sendReminderIfNeeded(event, memberId, "1day")
    }
  }

  for (const event of hourEvents) {
    const members = await listGroupMemberIds(event.group_id as number)
    for (const memberId of members) {
      await sendReminderIfNeeded(event, memberId, "2hours")
    }
  }
}

export async function processGroupEventRemindersThrottled(): Promise<void> {
  const now = Date.now()
  const last = globalStore.__lastGroupReminderRun ?? 0
  if (now - last < REMINDER_THROTTLE_MS) return
  globalStore.__lastGroupReminderRun = now
  await processGroupEventReminders()
}
