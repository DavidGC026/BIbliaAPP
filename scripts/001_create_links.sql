-- Tabla de vínculos versículo <-> nota de Joplin.
-- La app la crea automáticamente, pero puedes ejecutarla manualmente si lo prefieres.

CREATE TABLE IF NOT EXISTS bible_note_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  book_id INT NOT NULL,
  chapter INT NOT NULL,
  verse INT NOT NULL,
  note_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_verse_note (book_id, chapter, verse, note_id),
  KEY idx_verse (book_id, chapter, verse)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
