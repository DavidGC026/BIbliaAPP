CREATE TABLE IF NOT EXISTS bible_cross_references (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    vid_origen INT NOT NULL,
    vid_destino INT NOT NULL,
    votos INT DEFAULT 0,
    INDEX idx_origen (vid_origen),
    INDEX idx_destino (vid_destino),
    UNIQUE KEY uniq_cross_ref (vid_origen, vid_destino)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO bible_cross_references (vid_origen, vid_destino, votos) VALUES 
(1001001, 43001001, 100),
(1001001, 1001002, 50),
(43001001, 1001001, 100),
(43001001, 43001014, 80);
