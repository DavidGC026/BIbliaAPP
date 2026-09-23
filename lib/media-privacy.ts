import type { RowDataPacket } from "mysql2"
import { getAppSettings } from "./app-settings"
import { areFriends } from "./friends"
import { ensureGroupTables } from "./groups"
import { getPool } from "./mysql"
import type { AvatarVisibility } from "@/lib/avatar-visibility"

export async function shareOfficialChurch(userA: number, userB: number): Promise<boolean> {
  const settings = await getAppSettings()
  if (!settings.official_group_id) return false
  await ensureGroupTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT COUNT(DISTINCT gm.user_id) AS cnt
     FROM bible_group_members gm
     WHERE gm.group_id = ? AND gm.user_id IN (?, ?)`,
    [settings.official_group_id, userA, userB],
  )
  return (rows[0]?.cnt as number) >= 2
}

export async function shareAnyGroup(userA: number, userB: number): Promise<boolean> {
  if (userA === userB) return true
  await ensureGroupTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT 1
     FROM bible_group_members a
     JOIN bible_group_members b ON a.group_id = b.group_id
     WHERE a.user_id = ? AND b.user_id = ?
     LIMIT 1`,
    [userA, userB],
  )
  return rows.length > 0
}

export async function canViewUserAvatar(
  viewerId: number | null,
  ownerId: number,
): Promise<boolean> {
  if (viewerId === ownerId) return true
  if (viewerId == null) return false

  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT avatar_visibility, avatar_media_id FROM users WHERE id = ? LIMIT 1`,
    [ownerId],
  )
  if (!rows[0]?.avatar_media_id) return false

  const visibility = (rows[0].avatar_visibility as AvatarVisibility) || "groups"

  switch (visibility) {
    case "public":
      return true
    case "private":
      return false
    case "friends":
      return areFriends(viewerId, ownerId)
    case "church":
      return shareOfficialChurch(viewerId, ownerId)
    case "groups":
      return shareAnyGroup(viewerId, ownerId)
    default:
      return false
  }
}

export async function canViewFeedPost(
  viewerId: number,
  authorId: number,
  visibility: string,
): Promise<boolean> {
  if (viewerId === authorId) return true
  const vis = visibility || "public"
  switch (vis) {
    case "public":
      return true
    case "private":
      return false
    case "friends":
      return areFriends(viewerId, authorId)
    case "church":
      return shareOfficialChurch(viewerId, authorId)
    case "groups":
      return shareAnyGroup(viewerId, authorId)
    default:
      return vis === "public"
  }
}

export async function canViewMedia(
  viewerId: number | null,
  media: { user_id: number; kind: string; visibility: string; source_id?: number | null; filename?: string },
): Promise<boolean> {
  // Referencias históricas registradas por la migración, nunca elegidas por un upload.
  // Se consulta el contenido vigente: borrarlo, privatizarlo o salir del grupo retira el acceso.
  if (media.kind.startsWith("legacy_")) {
    if (viewerId == null || !Number.isSafeInteger(media.source_id) || !media.filename) return false
    const pool = getPool()
    if (media.kind === "legacy_feed") {
      const [posts] = await pool.query<RowDataPacket[]>(
        "SELECT user_id, visibility FROM feed_posts WHERE id = ? AND user_id = ? AND LOCATE(?, content) > 0",
        [media.source_id, media.user_id, media.filename],
      )
      return !!posts[0] && canViewFeedPost(viewerId, Number(posts[0].user_id), String(posts[0].visibility))
    }
    if (media.kind === "legacy_group") {
      const [groups] = await pool.query<RowDataPacket[]>(
        `SELECT 1 FROM bible_groups g JOIN bible_group_members m ON m.group_id = g.id
         WHERE g.id = ? AND g.created_by = ? AND m.user_id = ?
         AND (LOCATE(?, g.cover_image) > 0 OR LOCATE(?, g.avatar_image) > 0) LIMIT 1`,
        [media.source_id, media.user_id, viewerId, media.filename, media.filename],
      )
      return groups.length > 0
    }
    if (media.kind === "legacy_event") {
      const [events] = await pool.query<RowDataPacket[]>(
        `SELECT 1 FROM bible_group_events e JOIN bible_group_members m ON m.group_id = e.group_id
         WHERE e.id = ? AND e.created_by = ? AND m.user_id = ? AND LOCATE(?, e.image_url) > 0 LIMIT 1`,
        [media.source_id, media.user_id, viewerId, media.filename],
      )
      return events.length > 0
    }
    return false
  }
  if (media.kind === "avatar") {
    return canViewUserAvatar(viewerId, media.user_id)
  }
  if (media.kind === "church_logo") {
    return viewerId != null
  }
  if (media.kind === "group") {
    if (viewerId == null) return false
    if (viewerId === media.user_id) return true
    return shareAnyGroup(viewerId, media.user_id)
  }
  if (media.visibility === "public") return viewerId != null
  if (viewerId == null) return false
  if (viewerId === media.user_id) return true

  const vis = media.visibility as AvatarVisibility
  switch (vis) {
    case "friends":
      return areFriends(viewerId, media.user_id)
    case "church":
      return shareOfficialChurch(viewerId, media.user_id)
    case "groups":
      return shareAnyGroup(viewerId, media.user_id)
    default:
      return false
  }
}
