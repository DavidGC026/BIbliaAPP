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
  media: { user_id: number; kind: string; visibility: string },
): Promise<boolean> {
  if (media.kind === "avatar") {
    return canViewUserAvatar(viewerId, media.user_id)
  }
  if (media.kind === "church_logo" || media.kind === "group") {
    return viewerId != null
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
