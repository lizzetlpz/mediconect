-- SCRIPT DE CREACIÓN DE TABLAS PARA SISTEMA DE RECETAS MÉDICAS
-- Ejecutar en phpMyAdmin o cliente MySQL

-- ============== TABLA PRINCIPAL DE RECETAS ==============
CREATE TABLE IF NOT EXISTS `recetas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `medico_id` INT NOT NULL,
  `paciente_id` INT NOT NULL,
  `cita_id` INT NULL COMMENT 'Opcional: ID de la cita asociada',
  `codigo_validacion` VARCHAR(50) UNIQUE NOT NULL COMMENT 'Código único para validación (RX-xxxxxx-xxxxxx)',
  `fecha_emision` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_vencimiento` DATETIME NOT NULL,
  `estado` ENUM('activa', 'utilizada', 'vencida', 'cancelada') NOT NULL DEFAULT 'activa',
  `instrucciones` TEXT NOT NULL COMMENT 'Instrucciones generales para el paciente',
  `observaciones` TEXT NULL COMMENT 'Observaciones adicionales del médico',

  -- Campos para cuando la receta es utilizada
  `fecha_utilizacion` DATETIME NULL,
  `farmacia_utilizada` VARCHAR(255) NULL COMMENT 'Nombre de la farmacia donde se dispensó',
  `farmaceutico_responsable` VARCHAR(255) NULL COMMENT 'Farmacéutico que dispensó',
  `observaciones_farmacia` TEXT NULL,

  -- Campos para cuando la receta es cancelada
  `fecha_cancelacion` DATETIME NULL,
  `motivo_cancelacion` TEXT NULL,

  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Índices para optimización
  INDEX `idx_medico` (`medico_id`),
  INDEX `idx_paciente` (`paciente_id`),
  INDEX `idx_codigo` (`codigo_validacion`),
  INDEX `idx_estado` (`estado`),
  INDEX `idx_fecha_emision` (`fecha_emision`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Tabla principal de recetas médicas';

-- ============== TABLA DE MEDICAMENTOS DE LA RECETA ==============
CREATE TABLE IF NOT EXISTS `receta_medicamentos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `receta_id` INT NOT NULL,
  `nombre` VARCHAR(255) NOT NULL COMMENT 'Nombre del medicamento',
  `concentracion` VARCHAR(100) NULL COMMENT 'Ej: 500mg, 25mcg/ml',
  `forma_farmaceutica` VARCHAR(100) NULL COMMENT 'Ej: tabletas, jarabe, crema',
  `cantidad` VARCHAR(100) NOT NULL COMMENT 'Cantidad a dispensar (Ej: 30 tabletas, 120ml)',
  `via_administracion` VARCHAR(100) NULL COMMENT 'Ej: oral, tópica, intramuscular',
  `frecuencia` VARCHAR(255) NOT NULL COMMENT 'Ej: Cada 8 horas, 2 veces al día',
  `duracion` VARCHAR(100) NOT NULL COMMENT 'Ej: 7 días, 2 semanas, por 1 mes',
  `indicaciones_especiales` TEXT NULL COMMENT 'Indicaciones específicas para este medicamento',

  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Clave foránea
  FOREIGN KEY (`receta_id`) REFERENCES `recetas`(`id`) ON DELETE CASCADE,

  -- Índices
  INDEX `idx_receta` (`receta_id`),
  INDEX `idx_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Medicamentos incluidos en cada receta';

-- ============== DATOS DE PRUEBA ==============

-- Insertar algunas recetas de prueba
INSERT INTO `recetas` (
  `medico_id`, `paciente_id`, `codigo_validacion`,
  `fecha_emision`, `fecha_vencimiento`, `estado`,
  `instrucciones`, `observaciones`
) VALUES
(
  1, 2, 'RX-123456-ABC123',
  NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 'activa',
  'Tomar medicamentos con alimentos. Completar el tratamiento aunque se sienta mejor.',
  'Paciente con antecedentes de gastritis'
),
(
  1, 3, 'RX-789012-DEF456',
  NOW(), DATE_ADD(NOW(), INTERVAL 15 DAY), 'activa',
  'Aplicar crema 2 veces al día en área afectada. Evitar exposición al sol.',
  'Reacción alérgica leve'
),
(
  1, 2, 'RX-345678-GHI789',
  DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_ADD(NOW(), INTERVAL 28 DAY), 'utilizada',
  'Tomar con abundante agua. No conducir vehículos durante el tratamiento.',
  NULL
);

-- Actualizar la receta utilizada con datos de farmacia
UPDATE `recetas`
SET `fecha_utilizacion` = DATE_SUB(NOW(), INTERVAL 1 DAY),
    `farmacia_utilizada` = 'Farmacia Central',
    `farmaceutico_responsable` = 'Dra. María González',
    `observaciones_farmacia` = 'Medicamentos dispensados completamente'
WHERE `codigo_validacion` = 'RX-345678-GHI789';

-- Insertar medicamentos para la primera receta
INSERT INTO `receta_medicamentos` (
  `receta_id`, `nombre`, `concentracion`, `forma_farmaceutica`,
  `cantidad`, `via_administracion`, `frecuencia`, `duracion`, `indicaciones_especiales`
) VALUES
(
  1, 'Amoxicilina', '500mg', 'Cápsulas',
  '21 cápsulas', 'Oral', 'Cada 8 horas', '7 días',
  'Tomar con alimentos para evitar molestias gastrointestinales'
),
(
  1, 'Ibuprofeno', '400mg', 'Tabletas',
  '12 tabletas', 'Oral', 'Cada 12 horas si hay dolor', '4 días',
  'No exceder la dosis máxima. Suspender si hay molestias estomacales'
);

-- Insertar medicamentos para la segunda receta
INSERT INTO `receta_medicamentos` (
  `receta_id`, `nombre`, `concentracion`, `forma_farmaceutica`,
  `cantidad`, `via_administracion`, `frecuencia`, `duracion`, `indicaciones_especiales`
) VALUES
(
  2, 'Hidrocortisona', '1%', 'Crema',
  '30g', 'Tópica', '2 veces al día', '10 días',
  'Aplicar capa delgada solo en área afectada. Lavar manos después de aplicar'
);

-- Insertar medicamentos para la tercera receta (utilizada)
INSERT INTO `receta_medicamentos` (
  `receta_id`, `nombre`, `concentracion`, `forma_farmaceutica`,
  `cantidad`, `via_administracion`, `frecuencia`, `duracion`, `indicaciones_especiales`
) VALUES
(
  3, 'Loratadina', '10mg', 'Tabletas',
  '10 tabletas', 'Oral', '1 vez al día', '10 días',
  'Preferiblemente en las mañanas'
);

-- ============== CONSULTAS DE VERIFICACIÓN ==============

-- Verificar que las tablas se crearon correctamente
SELECT 'Tabla recetas creada:' as mensaje, COUNT(*) as registros FROM recetas;
SELECT 'Tabla receta_medicamentos creada:' as mensaje, COUNT(*) as registros FROM receta_medicamentos;

-- Mostrar recetas con sus medicamentos
SELECT
  r.codigo_validacion,
  r.estado,
  r.fecha_emision,
  r.instrucciones,
  rm.nombre as medicamento,
  rm.concentracion,
  rm.frecuencia,
  rm.duracion
FROM recetas r
LEFT JOIN receta_medicamentos rm ON r.id = rm.receta_id
ORDER BY r.fecha_emision DESC, rm.id;

-- ============== PERMISOS Y SEGURIDAD ==============

-- Crear usuario específico para el backend (opcional)
-- CREATE USER 'backend_recetas'@'localhost' IDENTIFIED BY 'password_seguro';
-- GRANT SELECT, INSERT, UPDATE ON medicos.recetas TO 'backend_recetas'@'localhost';
-- GRANT SELECT, INSERT, UPDATE ON medicos.receta_medicamentos TO 'backend_recetas'@'localhost';
-- FLUSH PRIVILEGES;

-- ============== ÍNDICES ADICIONALES PARA PERFORMANCE ==============

-- Índice compuesto para búsquedas comunes
CREATE INDEX idx_recetas_busqueda ON recetas (medico_id, estado, fecha_emision);
CREATE INDEX idx_recetas_paciente_activas ON recetas (paciente_id, estado);

-- ============== VISTAS ÚTILES ==============

-- Vista para recetas completas (con medicamentos)
CREATE VIEW vista_recetas_completas AS
SELECT
  r.id,
  r.codigo_validacion,
  r.medico_id,
  r.paciente_id,
  r.fecha_emision,
  r.fecha_vencimiento,
  r.estado,
  r.instrucciones,
  r.observaciones,
  r.farmacia_utilizada,
  r.fecha_utilizacion,
  um.nombre as medico_nombre,
  up.nombre as paciente_nombre,
  GROUP_CONCAT(
    CONCAT(rm.nombre, ' ', rm.concentracion, ' (', rm.cantidad, ')')
    SEPARATOR ', '
  ) as medicamentos_resumen
FROM recetas r
LEFT JOIN usuarios um ON r.medico_id = um.usuario_id
LEFT JOIN usuarios up ON r.paciente_id = up.usuario_id
LEFT JOIN receta_medicamentos rm ON r.id = rm.receta_id
GROUP BY r.id
ORDER BY r.fecha_emision DESC;

-- Vista para estadísticas de farmacia
CREATE VIEW vista_estadisticas_farmacia AS
SELECT
  farmacia_utilizada,
  COUNT(*) as total_recetas,
  MIN(fecha_utilizacion) as primera_dispensacion,
  MAX(fecha_utilizacion) as ultima_dispensacion
FROM recetas
WHERE estado = 'utilizada' AND farmacia_utilizada IS NOT NULL
GROUP BY farmacia_utilizada
ORDER BY total_recetas DESC;
