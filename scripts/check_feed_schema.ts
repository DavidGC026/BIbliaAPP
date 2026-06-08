import { getPool } from "../lib/mysql"
async function main() {
  const pool = getPool()
  const [rows] = await pool.query("SHOW CREATE TABLE feed_posts;")
  console.log(rows[0]['Create Table'])
  process.exit(0)
}
main().catch(console.error)
