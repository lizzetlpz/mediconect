-- Agregar campos para verificación por email
-- Este script actualiza la tabla usuarios para incluir verificación por email

-- 1. Agregar columnas para verificación
ALTER TABLE usuarios
ADD COLUMN token_verificacion VARCHAR(64) NULL,
ADD COLUMN token_expiracion TIMESTAMP NULL;

-- 2. Crear índice para búsqueda rápida de tokens
CREATE INDEX idx_usuarios_token_verificacion ON usuarios(token_verificacion);

-- 3. Verificar la estructura actualizada
DESCRIBE usuarios;

-- 4. Mostrar usuarios existentes (estos quedarán como activos = 1)
SELECT
    usuario_id,
    nombre,
    email,
    activo,
    token_verificacion,
    token_expiracion,
    fecha_registro
FROM usuarios
LIMIT 5;

-- Nota: Los usuarios existentes mantendrán activo = 1
-- Los nuevos usuarios tendrán activo = 0 hasta verificar su email
