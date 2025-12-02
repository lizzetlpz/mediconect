-- SQL: tabla_pagos.sql
-- Crea la tabla `pagos` para registrar pagos realizados por pacientes
DROP TABLE IF EXISTS `pagos`;
CREATE TABLE `pagos` (
  `pago_id` int NOT NULL AUTO_INCREMENT,
  `paciente_id` int NOT NULL,
  `medico_id` int DEFAULT NULL,
  `factura_id` int DEFAULT NULL,
  `cita_id` int DEFAULT NULL,
  `monto` decimal(10,2) NOT NULL,
  `metodo` varchar(50) DEFAULT NULL,
  `transaccion` varchar(150) DEFAULT NULL,
  `estado` varchar(30) DEFAULT 'pendiente',
  `descripcion` text,
  `fecha` datetime DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`pago_id`),
  KEY `paciente_id` (`paciente_id`),
  KEY `medico_id` (`medico_id`),
  KEY `factura_id` (`factura_id`),
  KEY `cita_id` (`cita_id`),
  CONSTRAINT `pagos_ibfk_1` FOREIGN KEY (`paciente_id`) REFERENCES `usuarios` (`usuario_id`) ON DELETE CASCADE,
  CONSTRAINT `pagos_ibfk_2` FOREIGN KEY (`medico_id`) REFERENCES `usuarios` (`usuario_id`) ON DELETE SET NULL,
  CONSTRAINT `pagos_ibfk_3` FOREIGN KEY (`factura_id`) REFERENCES `facturacion` (`factura_id`) ON DELETE SET NULL,
  CONSTRAINT `pagos_ibfk_4` FOREIGN KEY (`cita_id`) REFERENCES `citas` (`cita_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
