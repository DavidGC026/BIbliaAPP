import type { RowDataPacket, ResultSetHeader } from "mysql2"
import { ensureGroupTables } from "./groups"
import { isGroupAdmin } from "./group-roles"
import { getPool } from "./mysql"

export async function ensureGroupFeatureTables(): Promise<void> {
  await ensureGroupTables()
  const pool = getPool()

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bible_group_reading_plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      group_id INT NOT NULL UNIQUE,
      plan_id INT NOT NULL,
      assigned_by INT NOT NULL,
      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES bible_groups(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES bible_reading_plans(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bible_group_posts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      group_id INT NOT NULL,
      user_id INT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES bible_groups(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      KEY idx_group_created (group_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bible_group_discussions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      group_id INT NOT NULL,
      user_id INT NOT NULL,
      parent_id INT DEFAULT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES bible_groups(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES bible_group_discussions(id) ON DELETE CASCADE,
      KEY idx_group_parent (group_id, parent_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
}

export async function assertGroupMember(groupId: number, userId: number): Promise<string> {
  await ensureGroupFeatureTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT role FROM bible_group_members WHERE group_id = ? AND user_id = ? LIMIT 1`,
    [groupId, userId],
  )
  if (!rows[0]) throw new Error("No eres miembro de este grupo")
  return rows[0].role as string
}

export async function getGroupReadingPlan(groupId: number, userId: number) {
  await assertGroupMember(groupId, userId)
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT grp.plan_id, rp.name, rp.description, rp.duration_days, rp.chapters_data,
            grp.assigned_at
     FROM bible_group_reading_plans grp
     JOIN bible_reading_plans rp ON grp.plan_id = rp.id
     WHERE grp.group_id = ?
     LIMIT 1`,
    [groupId],
  )
  if (!rows[0]) return null

  const [members] = await pool.query<RowDataPacket[]>(
    `SELECT u.id AS user_id, u.name AS user_name, u.username,
            COALESCE(urp.progress, '[]') AS progress
     FROM bible_group_members gm
     JOIN users u ON gm.user_id = u.id
     LEFT JOIN user_reading_plans urp ON urp.user_id = u.id AND urp.plan_id = ?
     WHERE gm.group_id = ?
     ORDER BY u.name`,
    [rows[0].plan_id, groupId],
  )

  const durationDays = rows[0].duration_days as number
  const memberProgress = members.map((m) => {
    const completed: number[] = JSON.parse((m.progress as string) || "[]")
    const pct = durationDays > 0 ? Math.round((completed.length / durationDays) * 100) : 0
    return {
      user_id: m.user_id,
      user_name: m.user_name,
      user_username: m.username,
      completed_days: completed.length,
      progress_pct: Math.min(pct, 100),
    }
  })

  const avgPct =
    memberProgress.length > 0
      ? Math.round(memberProgress.reduce((s, m) => s + m.progress_pct, 0) / memberProgress.length)
      : 0

  return {
    plan_id: rows[0].plan_id,
    name: rows[0].name,
    description: rows[0].description,
    duration_days: durationDays,
    chapters_data: rows[0].chapters_data,
    assigned_at: rows[0].assigned_at,
    group_progress_pct: avgPct,
    members: memberProgress,
  }
}

export async function assignGroupReadingPlan(
  groupId: number,
  userId: number,
  planId: number,
): Promise<void> {
  const role = await assertGroupMember(groupId, userId)
  if (!isGroupAdmin(role)) throw new Error("Solo los administradores pueden asignar planes")

  await getPool().query(
    `INSERT INTO bible_group_reading_plans (group_id, plan_id, assigned_by)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE plan_id = VALUES(plan_id), assigned_by = VALUES(assigned_by), assigned_at = NOW()`,
    [groupId, planId, userId],
  )
}

export async function listGroupPosts(groupId: number, userId: number) {
  await assertGroupMember(groupId, userId)
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT p.id, p.content, p.image_url, p.created_at, u.name AS user_name, u.username AS user_username
     FROM bible_group_posts p
     JOIN users u ON p.user_id = u.id
     WHERE p.group_id = ?
     ORDER BY p.created_at DESC
     LIMIT 50`,
    [groupId],
  )
  return rows
}

export async function createGroupPost(
  groupId: number,
  userId: number,
  content: string,
  imageUrl?: string | null,
) {
  await assertGroupMember(groupId, userId)
  const [result] = await getPool().query<ResultSetHeader>(
    `INSERT INTO bible_group_posts (group_id, user_id, content, image_url) VALUES (?, ?, ?, ?)`,
    [groupId, userId, content.trim(), imageUrl || null],
  )
  return result.insertId
}

export async function listGroupDiscussions(groupId: number, userId: number) {
  await assertGroupMember(groupId, userId)
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT d.id, d.parent_id, d.content, d.created_at,
            u.name AS user_name, u.username AS user_username
     FROM bible_group_discussions d
     JOIN users u ON d.user_id = u.id
     WHERE d.group_id = ?
     ORDER BY d.created_at ASC`,
    [groupId],
  )
  return rows
}

export async function createGroupDiscussion(
  groupId: number,
  userId: number,
  content: string,
  parentId?: number | null,
) {
  await assertGroupMember(groupId, userId)
  const [result] = await getPool().query<ResultSetHeader>(
    `INSERT INTO bible_group_discussions (group_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)`,
    [groupId, userId, parentId ?? null, content.trim()],
  )
  return result.insertId
}
