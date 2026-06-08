import { getPool } from "../lib/mysql"

async function main() {
  const pool = getPool()
  const [rows] = await pool.query("SELECT id, user_id, type, is_public, content FROM feed_posts;")
  console.log(rows)
  process.exit(0)
}

main().catch(console.error)
