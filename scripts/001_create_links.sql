-- Tabla de notas de versículo (almacenamiento local).
-- La app la crea y migra automáticamente, pero puedes ejecutarla manualmente si lo prefieres.

CREATE TABLE IF NOT EXISTS bible_note_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  book_id INT NOT NULL,
  chapter INT NOT NULL,
  verse INT NOT NULL,
  note_id VARCHAR(255) DEFAULT NULL,
  note_content TEXT DEFAULT NULL,
  user_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_verse_user (book_id, chapter, verse, user_id),
  KEY idx_verse (book_id, chapter, verse)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Migración desde esquema Joplin antiguo (ejecutar solo si la tabla ya existía):
-- ALTER TABLE bible_note_links MODIFY note_id VARCHAR(255) NULL DEFAULT NULL;
-- ALTER TABLE bible_note_links ADD COLUMN note_content TEXT DEFAULT NULL;
-- ALTER TABLE bible_note_links ADD COLUMN user_id INT DEFAULT NULL;
-- ALTER TABLE bible_note_links DROP INDEX uniq_verse_note;
-- ALTER TABLE bible_note_links ADD UNIQUE KEY uniq_verse_user (book_id, chapter, verse, user_id);
