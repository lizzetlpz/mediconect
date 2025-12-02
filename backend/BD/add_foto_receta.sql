-- Agregar columna foto_receta a la tabla historial_medico
ALTER TABLE historial_medico ADD COLUMN foto_receta VARCHAR(255) DEFAULT NULL AFTER notas_medico;
