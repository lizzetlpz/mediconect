// Script para arreglar la base de datos automáticamente
import { getConnection } from '../BD/Conexionmysql';

async function fixDatabase() {
  console.log('🔧 INICIANDO REPARACIÓN DE BASE DE DATOS...');
  
  try {
    const pool = getConnection();
    
    // Verificar conexión
    console.log('📡 Verificando conexión...');
    await pool.query('SELECT 1');
    console.log('✅ Conexión establecida');

    // Crear tabla usuarios desde cero
    console.log('🗃️ Recreando tabla usuarios...');
    
    // Eliminar tabla si existe
    await pool.query('DROP TABLE IF EXISTS usuarios');
    console.log('✅ Tabla anterior eliminada');

    // Crear nueva tabla
    const createTableQuery = `
      CREATE TABLE usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(150) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        telefono VARCHAR(20) NULL,
        fecha_nacimiento DATE NULL,
        tipo_usuario ENUM('paciente', 'medico', 'administrador') NOT NULL DEFAULT 'paciente',
        activo BOOLEAN DEFAULT TRUE,
        email_verificado BOOLEAN DEFAULT FALSE,
        codigo_verificacion VARCHAR(6) NULL,
        fecha_expiracion_codigo DATETIME NULL,
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;

    await pool.query(createTableQuery);
    console.log('✅ Tabla usuarios creada');

    // Crear índices
    await pool.query('CREATE INDEX idx_usuarios_email ON usuarios(email)');
    await pool.query('CREATE INDEX idx_usuarios_tipo ON usuarios(tipo_usuario)');
    console.log('✅ Índices creados');

    // Verificar estructura
    const [describe] = await pool.query('DESCRIBE usuarios');
    console.log('📋 Estructura de la tabla:');
    console.table(describe);

    console.log('🎉 ¡BASE DE DATOS REPARADA EXITOSAMENTE!');
    
    process.exit(0);

  } catch (error: any) {
    console.error('❌ Error reparando base de datos:', error);
    process.exit(1);
  }
}

fixDatabase();