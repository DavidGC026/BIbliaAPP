import crypto from "crypto"
import type { RowDataPacket, ResultSetHeader } from "mysql2"
import { ensureDbTables } from "./bible"
import { isGroupAdmin, isValidGroupRole, normalizeGroupRole, type GroupRole } from "./group-roles"
import { canViewUserAvatar } from "./media-privacy"
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
      role VARCHAR(50) DEFAULT 'congregante',
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

  try {
    await pool.query(`ALTER TABLE bible_groups ADD COLUMN cover_image VARCHAR(500) DEFAULT NULL`)
  } catch (_) {}
  try {
    await pool.query(`ALTER TABLE bible_groups ADD COLUMN avatar_image VARCHAR(500) DEFAULT NULL`)
  } catch (_) {}
  try {
    await pool.query(`ALTER TABLE bible_groups ADD COLUMN is_official_church TINYINT(1) DEFAULT 0`)
  } catch (_) {}

  try {
    await pool.query(
      `UPDATE bible_group_members SET role = 'congregante' WHERE role = 'member' OR role = '' OR role IS NULL`,
    )
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
  cover_image: string | null
  avatar_image: string | null
  is_official_church: number
}

export interface GroupPreview {
  id: number
  name: string
  description: string
  member_count: number
  invite_code: string
  cover_image: string | null
  avatar_image: string | null
  is_official_church: number
}

const GROUP_SELECT_FIELDS = `g.id, g.name, g.description, g.invite_code, g.created_at,
  g.cover_image, g.avatar_image, g.is_official_church`

export async function listUserGroups(userId: number): Promise<GroupSummary[]> {
  await ensureGroupTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT ${GROUP_SELECT_FIELDS}, m.role,
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
    `SELECT ${GROUP_SELECT_FIELDS},
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
    `SELECT ${GROUP_SELECT_FIELDS}, m.role,
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
  coverImage?: string | null,
  avatarImage?: string | null,
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
          `INSERT INTO bible_groups (name, description, created_by, invite_code, cover_image, avatar_image) VALUES (?, ?, ?, ?, ?, ?)`,
          [name, description || "", userId, inviteCode, coverImage || null, avatarImage || null],
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
    `SELECT user_id FROM bible_group_members WHERE group_id = ? AND user_id = ? LIMIT 1`,
    [groupId, userId],
  )
  if (existing[0]) {
    return { groupId, alreadyMember: true }
  }

  await pool.query(
    `INSERT INTO bible_group_members (group_id, user_id, role) VALUES (?, ?, 'congregante')`,
    [groupId, userId],
  )

  return { groupId, alreadyMember: false }
}

export interface GroupMember {
  user_id: number
  name: string
  username: string
  role: GroupRole
  joined_at: string
  avatar_url: string | null
}

export async function listGroupMembers(groupId: number, userId: number): Promise<GroupMember[]> {
  await ensureGroupTables()
  const pool = getPool()

  const [membership] = await pool.query<RowDataPacket[]>(
    `SELECT user_id FROM bible_group_members WHERE group_id = ? AND user_id = ? LIMIT 1`,
    [groupId, userId],
  )
  if (!membership[0]) throw new Error("No eres miembro de este grupo")

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT gm.user_id, u.name, u.username, gm.role, gm.joined_at, u.avatar_media_id
     FROM bible_group_members gm
     JOIN users u ON gm.user_id = u.id
     WHERE gm.group_id = ?
     ORDER BY
       CASE gm.role
         WHEN 'admin' THEN 1
         WHEN 'lider' THEN 2
         WHEN 'maestro' THEN 3
         ELSE 4
       END,
       u.name ASC`,
    [groupId],
  )

  const members: GroupMember[] = []
  for (const row of rows) {
    const memberId = row.user_id as number
    const canView = await canViewUserAvatar(userId, memberId)
    members.push({
      user_id: memberId,
      name: row.name as string,
      username: row.username as string,
      role: normalizeGroupRole(row.role as string),
      joined_at: row.joined_at as string,
      avatar_url:
        canView && row.avatar_media_id ? `/api/media/${row.avatar_media_id}` : null,
    })
  }
  return members
}

export async function updateGroupMemberRole(
  groupId: number,
  requesterId: number,
  targetUserId: number,
  newRole: GroupRole,
): Promise<void> {
  if (!isValidGroupRole(newRole)) {
    throw new Error("Rol no válido")
  }

  await ensureGroupTables()
  const pool = getPool()

  const [requester] = await pool.query<RowDataPacket[]>(
    `SELECT role FROM bible_group_members WHERE group_id = ? AND user_id = ? LIMIT 1`,
    [groupId, requesterId],
  )
  if (!requester[0] || !isGroupAdmin(requester[0].role as string)) {
    throw new Error("Solo los administradores pueden cambiar roles")
  }

  const [target] = await pool.query<RowDataPacket[]>(
    `SELECT role FROM bible_group_members WHERE group_id = ? AND user_id = ? LIMIT 1`,
    [groupId, targetUserId],
  )
  if (!target[0]) throw new Error("El usuario no pertenece a este grupo")

  const currentRole = normalizeGroupRole(target[0].role as string)
  if (currentRole === newRole) return

  if (currentRole === "admin" && newRole !== "admin") {
    const [admins] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM bible_group_members WHERE group_id = ? AND role = 'admin'`,
      [groupId],
    )
    if ((admins[0]?.total as number) <= 1) {
      throw new Error("Debe haber al menos un administrador en el grupo")
    }
  }

  await pool.query(
    `UPDATE bible_group_members SET role = ? WHERE group_id = ? AND user_id = ?`,
    [newRole, groupId, targetUserId],
  )
}

export async function regenerateGroupInviteCode(groupId: number, userId: number): Promise<string> {
  await ensureGroupTables()
  const pool = getPool()

  const [members] = await pool.query<RowDataPacket[]>(
    `SELECT role FROM bible_group_members WHERE group_id = ? AND user_id = ? LIMIT 1`,
    [groupId, userId],
  )
  if (!members[0] || !isGroupAdmin(members[0].role as string)) {
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

export async function updateGroupAppearance(
  groupId: number,
  userId: number,
  data: { cover_image?: string | null; avatar_image?: string | null },
): Promise<void> {
  await ensureGroupTables()
  const pool = getPool()

  const [members] = await pool.query<RowDataPacket[]>(
    `SELECT role FROM bible_group_members WHERE group_id = ? AND user_id = ? LIMIT 1`,
    [groupId, userId],
  )
  if (!members[0] || !isGroupAdmin(members[0].role as string)) {
    throw new Error("Solo los administradores pueden editar la apariencia del grupo")
  }

  const fields: string[] = []
  const values: (string | null | number)[] = []

  if (data.cover_image !== undefined) {
    fields.push("cover_image = ?")
    values.push(data.cover_image)
  }
  if (data.avatar_image !== undefined) {
    fields.push("avatar_image = ?")
    values.push(data.avatar_image)
  }
  if (fields.length === 0) return

  values.push(groupId)
  await pool.query(`UPDATE bible_groups SET ${fields.join(", ")} WHERE id = ?`, values)
}

export async function listAllGroupsForAdmin(): Promise<
  { id: number; name: string; is_official_church: number }[]
> {
  await ensureGroupTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT id, name, is_official_church FROM bible_groups ORDER BY name`,
  )
  return rows as { id: number; name: string; is_official_church: number }[]
}
