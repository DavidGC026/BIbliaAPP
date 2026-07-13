import { getPool } from "../lib/mysql"
import type { RowDataPacket } from "mysql2/promise"

interface CreateTableRow extends RowDataPacket {
  "Create Table": string
}

async function main() {
  const pool = getPool()
  const [rows] = await pool.query<CreateTableRow[]>("SHOW CREATE TABLE feed_posts;")
  console.log(rows[0]['Create Table'])
  process.exit(0)
}
main().catch(console.error)
