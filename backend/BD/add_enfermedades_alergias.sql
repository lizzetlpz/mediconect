-- Agregar columnas para enfermedades y alergias a la tabla familiares
ALTER TABLE familiares ADD COLUMN enfermedades_cronicas JSON DEFAULT NULL;
ALTER TABLE familiares ADD COLUMN alergias JSON DEFAULT NULL;

-- Verificar que las columnas se agregaron correctamente
DESCRIBE familiares;
