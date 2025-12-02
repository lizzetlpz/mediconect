-- Script para configurar la base de datos en Railway MySQL
-- Ejecutar este script una vez que Railway MySQL esté configurado

-- 1. Crear la base de datos si no existe
CREATE DATABASE IF NOT EXISTS railway CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE railway;

-- 2. Ejecutar los scripts de creación de tablas existentes
-- (Copiar aquí el contenido de tus scripts SQL existentes)

-- 3. Crear usuario para la aplicación (opcional, Railway ya maneja esto)
-- GRANT ALL PRIVILEGES ON railway.* TO 'railway'@'%';
-- FLUSH PRIVILEGES;

-- Verificar que las tablas se crearon correctamente
SHOW TABLES;