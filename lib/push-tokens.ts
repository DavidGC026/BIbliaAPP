import type { RowDataPacket } from "mysql2"
import { getPool } from "./mysql"

export async function ensurePushTokenTables(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS user_push_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      expo_push_token VARCHAR(255) NOT NULL,
      platform VARCHAR(20) NOT NULL DEFAULT 'android',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_expo_token (expo_push_token),
      KEY idx_user_push (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
}

export async function upsertPushToken(
  userId: number,
  expoPushToken: string,
  platform: string,
): Promise<void> {
  await ensurePushTokenTables()
  await getPool().query(
    `INSERT INTO user_push_tokens (user_id, expo_push_token, platform)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE user_id = ?, platform = ?, updated_at = NOW()`,
    [userId, expoPushToken, platform, userId, platform],
  )
}

export async function deletePushToken(userId: number, expoPushToken: string): Promise<void> {
  await ensurePushTokenTables()
  await getPool().query(
    `DELETE FROM user_push_tokens WHERE user_id = ? AND expo_push_token = ?`,
    [userId, expoPushToken],
  )
}

export async function deleteAllPushTokensForUser(userId: number): Promise<void> {
  await ensurePushTokenTables()
  await getPool().query(`DELETE FROM user_push_tokens WHERE user_id = ?`, [userId])
}

export async function listPushTokensForUser(userId: number): Promise<string[]> {
  await ensurePushTokenTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT expo_push_token FROM user_push_tokens WHERE user_id = ?`,
    [userId],
  )
  return rows.map((r) => r.expo_push_token as string)
}
