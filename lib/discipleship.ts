import type { RowDataPacket, ResultSetHeader } from "mysql2"
import { ensureDbTables } from "./bible"
import { getPool } from "./mysql"

export async function ensureDiscipleshipTables(): Promise<void> {
  await ensureDbTables()
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS user_discipleship (
      id INT AUTO_INCREMENT PRIMARY KEY,
      mentor_id INT NOT NULL,
      disciple_id INT NOT NULL,
      status ENUM('pending', 'active', 'declined', 'ended') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_pair (mentor_id, disciple_id),
      FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (disciple_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
}

export async function getUserByUsername(username: string) {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT id, name, username FROM users WHERE username = ? LIMIT 1`,
    [username.replace(/^@/, "").toLowerCase()],
  )
  return rows[0] || null
}

export async function requestDiscipleship(discipleId: number, mentorUsername: string) {
  await ensureDiscipleshipTables()
  const mentor = await getUserByUsername(mentorUsername)
  if (!mentor) throw new Error("Usuario no encontrado")
  if (mentor.id === discipleId) throw new Error("No puedes ser tu propio mentor")

  try {
    const [result] = await getPool().query<ResultSetHeader>(
      `INSERT INTO user_discipleship (mentor_id, disciple_id, status) VALUES (?, ?, 'pending')`,
      [mentor.id, discipleId],
    )
    return result.insertId
  } catch {
    throw new Error("Ya existe una solicitud con este mentor")
  }
}

export async function respondDiscipleship(
  relationshipId: number,
  mentorId: number,
  accept: boolean,
): Promise<void> {
  await ensureDiscipleshipTables()
  const status = accept ? "active" : "declined"
  const [result] = await getPool().query<ResultSetHeader>(
    `UPDATE user_discipleship SET status = ? WHERE id = ? AND mentor_id = ? AND status = 'pending'`,
    [status, relationshipId, mentorId],
  )
  if (result.affectedRows === 0) throw new Error("Solicitud no encontrada")
}

export async function listDiscipleshipForUser(userId: number) {
  await ensureDiscipleshipTables()
  const [asMentor] = await getPool().query<RowDataPacket[]>(
    `SELECT d.id, d.status, d.created_at,
            u.id AS partner_id, u.name AS partner_name, u.username AS partner_username,
            'disciple' AS role
     FROM user_discipleship d
     JOIN users u ON d.disciple_id = u.id
     WHERE d.mentor_id = ?
     ORDER BY d.created_at DESC`,
    [userId],
  )
  const [asDisciple] = await getPool().query<RowDataPacket[]>(
    `SELECT d.id, d.status, d.created_at,
            u.id AS partner_id, u.name AS partner_name, u.username AS partner_username,
            'mentor' AS role
     FROM user_discipleship d
     JOIN users u ON d.mentor_id = u.id
     WHERE d.disciple_id = ?
     ORDER BY d.created_at DESC`,
    [userId],
  )
  return { asMentor, asDisciple }
}

export async function getMentorDiscipleProgress(mentorId: number, discipleId: number) {
  await ensureDiscipleshipTables()
  const [rel] = await getPool().query<RowDataPacket[]>(
    `SELECT id FROM user_discipleship
     WHERE mentor_id = ? AND disciple_id = ? AND status = 'active' LIMIT 1`,
    [mentorId, discipleId],
  )
  if (!rel[0]) throw new Error("No tienes acceso a este discípulo")

  const [plans] = await getPool().query<RowDataPacket[]>(
    `SELECT urp.plan_id, rp.name, urp.progress, urp.started_at
     FROM user_reading_plans urp
     JOIN bible_reading_plans rp ON urp.plan_id = rp.id
     WHERE urp.user_id = ?`,
    [discipleId],
  )

  const [devotionals] = await getPool().query<RowDataPacket[]>(
    `SELECT id, title, emotion, verse_ref, content, created_at
     FROM bible_devotionals
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 10`,
    [discipleId],
  )

  const [user] = await getPool().query<RowDataPacket[]>(
    `SELECT streak_count, last_active_date FROM users WHERE id = ? LIMIT 1`,
    [discipleId],
  )

  return {
    reading_plans: plans,
    devotionals,
    streak_count: user[0]?.streak_count ?? 0,
    last_active_date: user[0]?.last_active_date ?? null,
  }
}
