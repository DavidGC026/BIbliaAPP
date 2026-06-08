-- Script para crear la tabla de Versículos Diarios Perpetuos

CREATE TABLE IF NOT EXISTS bible_verse_of_the_day (
  id INT AUTO_INCREMENT PRIMARY KEY,
  month TINYINT NOT NULL,
  day TINYINT NOT NULL,
  theme VARCHAR(100) NOT NULL,
  idBook SMALLINT NOT NULL,
  chapter SMALLINT NOT NULL,
  verse_start SMALLINT NOT NULL,
  verse_end SMALLINT NOT NULL,
  UNIQUE KEY uniq_month_day (month, day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Agregar algunos índices para asegurar consultas rápidas (opcional ya que mes y día son únicos)
ALTER TABLE bible_verse_of_the_day ADD INDEX idx_book_chapter (idBook, chapter);
