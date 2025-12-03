-- Script para arreglar la base de datos de usuarios
-- Ejecutar este script en Railway MySQL

-- Primero, verificar si la tabla existe
SHOW TABLES LIKE 'usuarios';

-- Crear la tabla usuarios si no existe o recrearla
DROP TABLE IF EXISTS usuarios;

CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(150) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  telefono VARCHAR(20) NULL,
  fecha_nacimiento DATE NULL,
  tipo_usuario ENUM('paciente', 'medico', 'administrador') NOT NULL DEFAULT 'paciente',
  activo BOOLEAN DEFAULT TRUE,
  email_verificado BOOLEAN DEFAULT FALSE,
  codigo_verificacion VARCHAR(6) NULL,
  fecha_expiracion_codigo DATETIME NULL,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Crear índices para optimización
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_tipo ON usuarios(tipo_usuario);

-- Mostrar la estructura creada
DESCRIBE usuarios;

-- Insertar un usuario de prueba
INSERT INTO usuarios 
(nombre, apellido, email, password, tipo_usuario, activo, email_verificado, codigo_verificacion, fecha_expiracion_codigo)
VALUES 
('Test', 'User', 'test@test.com', '$2b$10$dummy.hash.for.testing', 'paciente', 1, 0, '123456', NOW() + INTERVAL 24 HOUR);

-- Verificar que se insertó correctamente
SELECT * FROM usuarios WHERE email = 'test@test.com';