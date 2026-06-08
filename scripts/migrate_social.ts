import { getPool } from "../lib/mysql"

async function migrate() {
  const pool = getPool()
  try {
    console.log("Starting migration...")

    // 1. Add username column to users
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(30) UNIQUE NULL`)
    console.log("Added username column to users table.")

    // 2. Create user_follows table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_follows (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        follower_id INT NOT NULL,
        followed_id INT NOT NULL,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_follow (follower_id, followed_id),
        FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (followed_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)
    console.log("Created user_follows table.")

    // 3. Create feed_posts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feed_posts (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        user_id     INT NOT NULL,
        type        ENUM('verse','devotional','note','custom') NOT NULL DEFAULT 'custom',
        content     TEXT NOT NULL,
        verse_ref   VARCHAR(150) NULL,
        verse_text  TEXT NULL,
        is_public   TINYINT(1) DEFAULT 1,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at)
      )
    `)
    console.log("Created feed_posts table.")

    // 4. Create feed_likes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feed_likes (
        id       INT AUTO_INCREMENT PRIMARY KEY,
        post_id  INT NOT NULL,
        user_id  INT NOT NULL,
        UNIQUE KEY uq_like (post_id, user_id),
        FOREIGN KEY (post_id) REFERENCES feed_posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)
    console.log("Created feed_likes table.")

    console.log("Migration complete!")
  } catch (error) {
    console.error("Migration failed:", error)
  } finally {
    process.exit(0)
  }
}

migrate()
