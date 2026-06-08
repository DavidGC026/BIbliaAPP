CREATE TABLE IF NOT EXISTS user_external_books (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  cover_image MEDIUMTEXT,
  status VARCHAR(50) DEFAULT 'leyendo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_external_book_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  book_id BIGINT NOT NULL,
  user_id INT NOT NULL,
  title VARCHAR(255),
  pages_read VARCHAR(100),
  chapter VARCHAR(100),
  reflection TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_book (book_id),
  INDEX idx_user_log (user_id),
  FOREIGN KEY (book_id) REFERENCES user_external_books(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
