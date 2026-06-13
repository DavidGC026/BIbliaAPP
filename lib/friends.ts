import type { RowDataPacket, ResultSetHeader } from "mysql2"
import { createNotification } from "./bible"
import { emitNotification } from "./notification-bus"
import { getPool } from "./mysql"
import { runOnce } from "./once-async"

export type FriendRequestStatus = "pending" | "accepted" | "rejected"

export async function ensureFriendTables(): Promise<void> {
  return runOnce("ensureFriendTables", _ensureFriendTables)
}

async function _ensureFriendTables(): Promise<void> {
  const pool = getPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_friend_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      requester_id INT NOT NULL,
      receiver_id INT NOT NULL,
      status ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      responded_at TIMESTAMP NULL DEFAULT NULL,
      UNIQUE KEY uniq_friend_pair (requester_id, receiver_id),
      FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
      KEY idx_receiver_pending (receiver_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
}

export async function areFriends(userA: number, userB: number): Promise<boolean> {
  if (userA === userB) return true
  await ensureFriendTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT id FROM user_friend_requests
     WHERE status = 'accepted'
       AND ((requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?))
     LIMIT 1`,
    [userA, userB, userB, userA],
  )
  return rows.length > 0
}

export async function getFriendStatus(
  viewerId: number,
  targetId: number,
): Promise<"none" | "pending_sent" | "pending_received" | "friends"> {
  if (viewerId === targetId) return "friends"
  await ensureFriendTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT requester_id, receiver_id, status FROM user_friend_requests
     WHERE (requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?)
     LIMIT 1`,
    [viewerId, targetId, targetId, viewerId],
  )
  if (!rows[0]) return "none"
  if (rows[0].status === "accepted") return "friends"
  if (rows[0].requester_id === viewerId) return "pending_sent"
  return "pending_received"
}

export async function sendFriendRequest(requesterId: number, receiverId: number): Promise<void> {
  if (requesterId === receiverId) throw new Error("No puedes agregarte a ti mismo")
  await ensureFriendTables()
  const pool = getPool()

  const existing = await getFriendStatus(requesterId, receiverId)
  if (existing === "friends") throw new Error("Ya son amigos")
  if (existing === "pending_sent") throw new Error("Ya enviaste una solicitud")
  if (existing === "pending_received") {
    await respondFriendRequest(receiverId, requesterId, "accept")
    return
  }

  await pool.query(
    `INSERT INTO user_friend_requests (requester_id, receiver_id, status) VALUES (?, ?, 'pending')`,
    [requesterId, receiverId],
  )

  const notifId = await createNotification(receiverId, requesterId, "friend_request")
  if (notifId) {
    emitNotification(receiverId, { type: "friend_request", actorName: "" })
  }
}

export async function respondFriendRequest(
  receiverId: number,
  requesterId: number,
  action: "accept" | "reject",
): Promise<void> {
  await ensureFriendTables()
  const pool = getPool()
  const status: FriendRequestStatus = action === "accept" ? "accepted" : "rejected"

  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE user_friend_requests
     SET status = ?, responded_at = NOW()
     WHERE requester_id = ? AND receiver_id = ? AND status = 'pending'`,
    [status, requesterId, receiverId],
  )
  if (result.affectedRows === 0) throw new Error("Solicitud no encontrada")

  if (action === "accept") {
    const notifId = await createNotification(requesterId, receiverId, "friend_accepted")
    if (notifId) {
      emitNotification(requesterId, { type: "friend_accepted", actorName: "" })
    }
  }
}

export async function listPendingFriendRequests(userId: number) {
  await ensureFriendTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT fr.id, fr.requester_id, fr.created_at, u.name, u.username
     FROM user_friend_requests fr
     JOIN users u ON fr.requester_id = u.id
     WHERE fr.receiver_id = ? AND fr.status = 'pending'
     ORDER BY fr.created_at DESC`,
    [userId],
  )
  return rows
}

export async function listFriends(userId: number) {
  await ensureFriendTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT u.id, u.name, u.username
     FROM user_friend_requests fr
     JOIN users u ON (
       CASE WHEN fr.requester_id = ? THEN fr.receiver_id ELSE fr.requester_id END = u.id
     )
     WHERE fr.status = 'accepted' AND (fr.requester_id = ? OR fr.receiver_id = ?)
     ORDER BY u.name`,
    [userId, userId, userId],
  )
  return rows
}
