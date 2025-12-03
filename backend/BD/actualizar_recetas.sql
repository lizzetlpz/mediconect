-- Agregar columnas para foto y autenticación médica a la tabla recetas
ALTER TABLE recetas
ADD COLUMN foto_receta VARCHAR(255) NULL COMMENT 'Ruta de la imagen de la receta manuscrita',
ADD COLUMN codigo_medico VARCHAR(50) NULL COMMENT 'Código médico profesional',
ADD COLUMN firma_digital TEXT NULL COMMENT 'Firma digital del médico para autenticación';

-- Actualizar un registro de prueba con datos de ejemplo
UPDATE recetas
SET codigo_medico = 'MED-12345',
    firma_digital = 'DR_JUAN_PEREZ_2024_12_19_RXTEST123'
WHERE id = 1;

-- Verificar las columnas agregadas
SELECT * FROM recetas LIMIT 3;

-- Mostrar estructura actualizada de la tabla
DESCRIBE recetas;
