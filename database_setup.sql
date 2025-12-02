-- Script de inicialización de base de datos para MediConnect
-- Ejecutar en Railway MySQL después de crear la base de datos

-- Tabla de usuarios (médicos, pacientes, administradores)
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    tipo_usuario ENUM('medico', 'paciente', 'administrador') NOT NULL,
    fecha_nacimiento DATE,
    genero ENUM('M', 'F', 'Otro'),
    direccion TEXT,
    ciudad VARCHAR(100),
    estado VARCHAR(100),
    codigo_postal VARCHAR(10),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE,
    email_verificado BOOLEAN DEFAULT FALSE,
    codigo_verificacion VARCHAR(6),
    numero_licencia VARCHAR(50), -- Para médicos
    especialidad VARCHAR(100),   -- Para médicos
    INDEX idx_email (email),
    INDEX idx_tipo_usuario (tipo_usuario)
);

-- Tabla de citas médicas
CREATE TABLE IF NOT EXISTS citas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT NOT NULL,
    medico_id INT NOT NULL,
    fecha_cita DATETIME NOT NULL,
    motivo TEXT,
    estado ENUM('agendada', 'confirmada', 'en_curso', 'completada', 'cancelada') DEFAULT 'agendada',
    notas_medicas TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (paciente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (medico_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_fecha_cita (fecha_cita),
    INDEX idx_paciente_id (paciente_id),
    INDEX idx_medico_id (medico_id)
);

-- Tabla de prescripciones/recetas médicas
CREATE TABLE IF NOT EXISTS recetas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT NOT NULL,
    medico_id INT NOT NULL,
    cita_id INT,
    medicamento VARCHAR(200) NOT NULL,
    dosis VARCHAR(100) NOT NULL,
    frecuencia VARCHAR(100) NOT NULL,
    duracion VARCHAR(100) NOT NULL,
    instrucciones_especiales TEXT,
    fecha_prescripcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activa BOOLEAN DEFAULT TRUE,
    foto_receta VARCHAR(500), -- URL de la foto de la receta
    codigo_medico VARCHAR(100), -- Código de autenticación médica
    firma_digital VARCHAR(500), -- Firma digital del médico
    FOREIGN KEY (paciente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (medico_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE SET NULL,
    INDEX idx_paciente_id (paciente_id),
    INDEX idx_medico_id (medico_id),
    INDEX idx_fecha_prescripcion (fecha_prescripcion)
);

-- Tabla de historial médico
CREATE TABLE IF NOT EXISTS historial_medico (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT NOT NULL,
    medico_id INT NOT NULL,
    fecha_consulta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sintomas TEXT,
    diagnostico TEXT,
    tratamiento TEXT,
    observaciones TEXT,
    peso DECIMAL(5,2),
    altura DECIMAL(5,2),
    presion_arterial VARCHAR(20),
    temperatura DECIMAL(4,1),
    frecuencia_cardiaca INT,
    FOREIGN KEY (paciente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (medico_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_paciente_id (paciente_id),
    INDEX idx_fecha_consulta (fecha_consulta)
);

-- Tabla de facturas/pagos
CREATE TABLE IF NOT EXISTS facturas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT NOT NULL,
    cita_id INT,
    medico_id INT NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    concepto VARCHAR(200) NOT NULL,
    estado ENUM('pendiente', 'pagada', 'cancelada') DEFAULT 'pendiente',
    fecha_emision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento DATE,
    fecha_pago TIMESTAMP NULL,
    metodo_pago VARCHAR(50),
    numero_factura VARCHAR(100) UNIQUE,
    archivo_pdf VARCHAR(500), -- Ruta del archivo PDF de la factura
    FOREIGN KEY (paciente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (medico_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE SET NULL,
    INDEX idx_paciente_id (paciente_id),
    INDEX idx_numero_factura (numero_factura),
    INDEX idx_fecha_emision (fecha_emision)
);

-- Tabla de familiares (para pacientes)
CREATE TABLE IF NOT EXISTS familiares (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    parentesco VARCHAR(50) NOT NULL,
    telefono VARCHAR(20),
    email VARCHAR(150),
    es_contacto_emergencia BOOLEAN DEFAULT FALSE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (paciente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_paciente_id (paciente_id)
);

-- Tabla de pruebas médicas
CREATE TABLE IF NOT EXISTS pruebas_medicas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT NOT NULL,
    medico_id INT NOT NULL,
    cita_id INT,
    tipo_prueba VARCHAR(100) NOT NULL,
    descripcion TEXT,
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_realizacion DATE,
    resultados TEXT,
    archivo_resultados VARCHAR(500), -- Ruta del archivo de resultados
    estado ENUM('solicitada', 'en_proceso', 'completada', 'cancelada') DEFAULT 'solicitada',
    FOREIGN KEY (paciente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (medico_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE SET NULL,
    INDEX idx_paciente_id (paciente_id),
    INDEX idx_fecha_solicitud (fecha_solicitud)
);

-- Tabla de mensajes de chat
CREATE TABLE IF NOT EXISTS mensajes_chat (
    id INT AUTO_INCREMENT PRIMARY KEY,
    emisor_id INT NOT NULL,
    receptor_id INT NOT NULL,
    mensaje TEXT NOT NULL,
    fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    leido BOOLEAN DEFAULT FALSE,
    tipo_mensaje ENUM('texto', 'imagen', 'archivo') DEFAULT 'texto',
    archivo_adjunto VARCHAR(500),
    FOREIGN KEY (emisor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (receptor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_emisor_receptor (emisor_id, receptor_id),
    INDEX idx_fecha_envio (fecha_envio)
);

-- Insertar usuario administrador por defecto
INSERT IGNORE INTO usuarios (
    nombre, apellido, email, password, tipo_usuario, email_verificado
) VALUES (
    'Admin', 'Sistema', 'admin@mediconect.com', 
    '$2b$10$example_hash', 'administrador', TRUE
);

-- Insertar médico de ejemplo
INSERT IGNORE INTO usuarios (
    nombre, apellido, email, password, tipo_usuario, numero_licencia, 
    especialidad, email_verificado
) VALUES (
    'Dr. Juan', 'Pérez', 'dr.perez@mediconect.com', 
    '$2b$10$example_hash', 'medico', 'LIC123456', 
    'Medicina General', TRUE
);