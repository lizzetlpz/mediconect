-- Crear tabla para mensajes de chat
CREATE TABLE IF NOT EXISTS mensajes_chat (
    mensaje_id INT AUTO_INCREMENT PRIMARY KEY,
    consulta_id INT NOT NULL,
    remitente_id INT NOT NULL,
    mensaje TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    leido TINYINT(1) DEFAULT 0,
    FOREIGN KEY (consulta_id) REFERENCES consultas(consulta_id) ON DELETE CASCADE,
    FOREIGN KEY (remitente_id) REFERENCES usuarios(usuario_id) ON DELETE CASCADE,
    INDEX idx_consulta (consulta_id),
    INDEX idx_timestamp (timestamp)
);
