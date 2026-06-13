import type { RowDataPacket, ResultSetHeader } from "mysql2"
import { ensureGroupTables } from "./groups"
import { getPool } from "./mysql"
import { runOnce } from "./once-async"

export interface AppSettings {
  church_name: string
  church_logo_url: string | null
  official_group_id: number | null
}

const DEFAULT_SETTINGS: AppSettings = {
  church_name: "BibliaAPP",
  church_logo_url: null,
  official_group_id: null,
}

export async function ensureAppSettingsTable(): Promise<void> {
  return runOnce("ensureAppSettingsTable", _ensureAppSettingsTable)
}

async function _ensureAppSettingsTable(): Promise<void> {
  await ensureGroupTables()
  const pool = getPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id INT PRIMARY KEY DEFAULT 1,
      church_name VARCHAR(255) NOT NULL DEFAULT 'BibliaAPP',
      church_logo_url VARCHAR(500) DEFAULT NULL,
      official_group_id INT DEFAULT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT chk_single_row CHECK (id = 1),
      FOREIGN KEY (official_group_id) REFERENCES bible_groups(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  await pool.query(`INSERT IGNORE INTO app_settings (id, church_name) VALUES (1, 'BibliaAPP')`)
}

export async function getAppSettings(): Promise<AppSettings> {
  await ensureAppSettingsTable()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT church_name, church_logo_url, official_group_id FROM app_settings WHERE id = 1 LIMIT 1`,
  )
  return (rows[0] as AppSettings) || DEFAULT_SETTINGS
}

export async function updateAppSettings(
  data: Partial<AppSettings>,
): Promise<AppSettings> {
  await ensureAppSettingsTable()
  const pool = getPool()

  if (data.official_group_id != null) {
    await pool.query(`UPDATE bible_groups SET is_official_church = 0`)
    await pool.query(`UPDATE bible_groups SET is_official_church = 1 WHERE id = ?`, [
      data.official_group_id,
    ])
  }

  const fields: string[] = []
  const values: (string | number | null)[] = []

  if (data.church_name !== undefined) {
    fields.push("church_name = ?")
    values.push(data.church_name)
  }
  if (data.church_logo_url !== undefined) {
    fields.push("church_logo_url = ?")
    values.push(data.church_logo_url)
  }
  if (data.official_group_id !== undefined) {
    fields.push("official_group_id = ?")
    values.push(data.official_group_id)
  }

  if (fields.length > 0) {
    await pool.query<ResultSetHeader>(
      `UPDATE app_settings SET ${fields.join(", ")} WHERE id = 1`,
      values,
    )
  }

  return getAppSettings()
}
