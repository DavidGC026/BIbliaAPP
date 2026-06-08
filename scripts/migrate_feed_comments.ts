import { getPool } from "../lib/mysql"

async function main() {
  const pool = getPool()
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS feed_comments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      post_id INT NOT NULL,
      user_id INT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES feed_posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
  `)
  
  console.log("feed_comments table created successfully")
  process.exit(0)
}

main().catch(console.error)
