-- Comentarios bíblicos de dominio público (Matthew Henry, Charles Spurgeon…).
-- La app crea la tabla sola al arrancar (lib/commentaries.ts → ensureCommentaryTables),
-- pero puedes ejecutar este fichero a mano si prefieres migrar antes del despliegue:
--
--   mysql -u USUARIO -p BASE_DE_DATOS < scripts/003_commentaries.sql
--
-- Un comentario cubre un RANGO de versículos (verse_start..verse_end): Matthew
-- Henry comenta bloques enteros ("Génesis 1:1-5"), no versículo a versículo. Un
-- comentario de un solo versículo es el caso verse_start = verse_end.
--
-- bible_id es 0 («todas las versiones»), no NULL, a propósito: MySQL considera
-- distintos entre sí los NULL dentro de un UNIQUE KEY, así que con NULL cada
-- reimportación insertaría filas duplicadas en lugar de actualizar las
-- existentes. Con 0 el ON DUPLICATE KEY UPDATE del importador funciona.
-- Solo se pone un idBible real si el comentario cita una traducción concreta.

CREATE TABLE IF NOT EXISTS bible_commentaries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bible_id INT NOT NULL DEFAULT 0,
  book_id INT NOT NULL,
  chapter INT NOT NULL,
  verse_start INT NOT NULL,
  verse_end INT NOT NULL,
  author VARCHAR(120) NOT NULL,
  language_code VARCHAR(10) NOT NULL DEFAULT 'es',
  content_md MEDIUMTEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- Índice compuesto de búsqueda: el lector siempre pregunta por
  -- libro + capítulo + idioma y luego filtra el rango que cubre el versículo.
  KEY idx_commentary_lookup (book_id, chapter, language_code, verse_start, verse_end),
  -- Clave de deduplicación del importador (upsert).
  UNIQUE KEY uniq_commentary_passage (
    bible_id, book_id, chapter, verse_start, verse_end, author, language_code
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
