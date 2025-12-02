-- =====================================================
-- TABLA FALTANTE PARA REGISTROS MÉDICOS GENERALES
-- Ejecuta este script en MySQL Workbench
-- =====================================================

-- Tabla: registros_medicos (Para registros adicionales/generales)
CREATE TABLE IF NOT EXISTS `registros_medicos` (
  `registro_id` int NOT NULL AUTO_INCREMENT,
  `paciente_id` int NOT NULL,
  `tipo_registro` varchar(100) NOT NULL,
  `descripcion` text,
  `archivo_url` varchar(500) DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`registro_id`),
  KEY `paciente_id` (`paciente_id`),
  CONSTRAINT `registros_medicos_ibfk_1` FOREIGN KEY (`paciente_id`) REFERENCES `usuarios` (`usuario_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =====================================================
-- FIN DE SCRIPT
-- =====================================================
