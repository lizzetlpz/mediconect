-- SQL: tabla_familiares.sql
-- Crea la tabla `familiares` para persistir familiares por owner (usuario que los creó)
DROP TABLE IF EXISTS `familiares`;
CREATE TABLE `familiares` (
  `familiar_id` int NOT NULL AUTO_INCREMENT,
  `owner_id` int NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `apellido_paterno` varchar(100) DEFAULT NULL,
  `apellido_materno` varchar(100) DEFAULT NULL,
  `relacion` varchar(50) DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `tipo_sangre` varchar(20) DEFAULT NULL,
  `puede_agendar` tinyint(1) DEFAULT 0,
  `puede_ver_historial` tinyint(1) DEFAULT 0,
  `notas` text,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`familiar_id`),
  KEY `owner_id` (`owner_id`),
  CONSTRAINT `familiares_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `usuarios` (`usuario_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
