import crypto from "crypto"
import type { RowDataPacket, ResultSetHeader } from "mysql2"
import { ensureDbTables } from "./bible"
import { getPool } from "./mysql"

export function generateInviteCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase()
}

async function backfillMissingInviteCodes(): Promise<void> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM bible_groups WHERE invite_code IS NULL OR invite_code = ''`,
  )
  for (const row of rows) {
    let attempts = 0
    while (attempts < 5) {
      const code = generateInviteCode()
      try {
        await pool.query(`UPDATE bible_groups SET invite_code = ? WHERE id = ?`, [code, row.id])
        break
      } catch {
        attempts++
      }
    }
  }
}

export async function ensureGroupTables(): Promise<void> {
  await ensureDbTables()
  const pool = getPool()

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bible_groups (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      created_by INT NOT NULL,
      invite_code VARCHAR(12) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bible_group_members (
      id INT AUTO_INCREMENT PRIMARY KEY,
      group_id INT NOT NULL,
      user_id INT NOT NULL,
      role ENUM('admin', 'member') DEFAULT 'member',
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_group_user (group_id, user_id),
      FOREIGN KEY (group_id) REFERENCES bible_groups(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  try {
    await pool.query(`ALTER TABLE bible_groups ADD COLUMN invite_code VARCHAR(12) DEFAULT NULL`)
  } catch (_) {}

  try {
    await pool.query(`ALTER TABLE bible_groups ADD UNIQUE KEY uniq_invite_code (invite_code)`)
  } catch (_) {}

  await backfillMissingInviteCodes()
}

export interface GroupSummary {
  id: number
  name: string
  description: string
  role: string
  invite_code: string
  member_count: number
  created_at: string
}

export interface GroupPreview {
  id: number
  name: string
  description: string
  member_count: number
  invite_code: string
}

export async function listUserGroups(userId: number): Promise<GroupSummary[]> {
  await ensureGroupTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT g.id, g.name, g.description, g.invite_code, g.created_at, m.role,
            (SELECT COUNT(*) FROM bible_group_members gm WHERE gm.group_id = g.id) AS member_count
     FROM bible_groups g
     JOIN bible_group_members m ON g.id = m.group_id
     WHERE m.user_id = ?
     ORDER BY g.created_at DESC`,
    [userId],
  )
  return rows as GroupSummary[]
}

export async function getGroupPreviewByInviteCode(code: string): Promise<GroupPreview | null> {
  await ensureGroupTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT g.id, g.name, g.description, g.invite_code,
            (SELECT COUNT(*) FROM bible_group_members gm WHERE gm.group_id = g.id) AS member_count
     FROM bible_groups g
     WHERE g.invite_code = ?
     LIMIT 1`,
    [code.toUpperCase()],
  )
  return (rows[0] as GroupPreview) || null
}

export async function getGroupDetail(groupId: number, userId: number): Promise<GroupSummary | null> {
  await ensureGroupTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT g.id, g.name, g.description, g.invite_code, g.created_at, m.role,
            (SELECT COUNT(*) FROM bible_group_members gm WHERE gm.group_id = g.id) AS member_count
     FROM bible_groups g
     JOIN bible_group_members m ON g.id = m.group_id
     WHERE g.id = ? AND m.user_id = ?
     LIMIT 1`,
    [groupId, userId],
  )
  return (rows[0] as GroupSummary) || null
}

export async function createGroup(
  userId: number,
  name: string,
  description: string,
): Promise<{ id: number; name: string; description: string; role: string; invite_code: string }> {
  await ensureGroupTables()
  const pool = getPool()
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()
    let inviteCode = generateInviteCode()
    let inserted = false
    let groupId = 0

    for (let i = 0; i < 5; i++) {
      try {
        const [result] = await conn.query<ResultSetHeader>(
          `INSERT INTO bible_groups (name, description, created_by, invite_code) VALUES (?, ?, ?, ?)`,
          [name, description || "", userId, inviteCode],
        )
        groupId = result.insertId
        inserted = true
        break
      } catch {
        inviteCode = generateInviteCode()
      }
    }

    if (!inserted) throw new Error("No se pudo generar un código de invitación único")

    await conn.query(
      `INSERT INTO bible_group_members (group_id, user_id, role) VALUES (?, ?, 'admin')`,
      [groupId, userId],
    )

    await conn.commit()
    return { id: groupId, name, description, role: "admin", invite_code: inviteCode }
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

export async function joinGroupByInviteCode(
  userId: number,
  inviteCode: string,
): Promise<{ groupId: number; alreadyMember: boolean }> {
  await ensureGroupTables()
  const pool = getPool()
  const code = inviteCode.trim().toUpperCase()

  const [groups] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM bible_groups WHERE invite_code = ? LIMIT 1`,
    [code],
  )
  if (!groups[0]) throw new Error("Código de invitación no válido")

  const groupId = groups[0].id as number

  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM bible_group_members WHERE group_id = ? AND user_id = ? LIMIT 1`,
    [groupId, userId],
  )
  if (existing[0]) {
    return { groupId, alreadyMember: true }
  }

  await pool.query(
    `INSERT INTO bible_group_members (group_id, user_id, role) VALUES (?, ?, 'member')`,
    [groupId, userId],
  )

  return { groupId, alreadyMember: false }
}

export async function regenerateGroupInviteCode(groupId: number, userId: number): Promise<string> {
  await ensureGroupTables()
  const pool = getPool()

  const [members] = await pool.query<RowDataPacket[]>(
    `SELECT role FROM bible_group_members WHERE group_id = ? AND user_id = ? LIMIT 1`,
    [groupId, userId],
  )
  if (!members[0] || members[0].role !== "admin") {
    throw new Error("Solo los administradores pueden regenerar el código")
  }

  for (let i = 0; i < 5; i++) {
    const code = generateInviteCode()
    try {
      const [result] = await pool.query<ResultSetHeader>(
        `UPDATE bible_groups SET invite_code = ? WHERE id = ?`,
        [code, groupId],
      )
      if (result.affectedRows > 0) return code
    } catch {
      continue
    }
  }

  throw new Error("No se pudo regenerar el código de invitación")
}
