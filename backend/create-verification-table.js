require('dotenv').config();
const mysql = require('mysql2');

async function crearTablaVerificacion() {
    console.log('🔄 Creando tabla temporal para verificaciones...');

    const connection = mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '12345',
        database: process.env.DB_NAME || 'paginaweb'
    });

    try {
        // Crear tabla de verificaciones pendientes
        console.log('📋 Creando tabla verificaciones_pendientes...');

        await new Promise((resolve, reject) => {
            connection.query(`
                CREATE TABLE IF NOT EXISTS verificaciones_pendientes (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    token VARCHAR(64) UNIQUE NOT NULL,
                    nombre VARCHAR(255) NOT NULL,
                    apellido_paterno VARCHAR(255) NOT NULL,
                    apellido_materno VARCHAR(255),
                    password_hash VARCHAR(255) NOT NULL,
                    telefono VARCHAR(20),
                    fecha_nacimiento DATE,
                    rol_id INT DEFAULT 2,
                    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    fecha_expiracion TIMESTAMP NOT NULL,
                    INDEX idx_token (token),
                    INDEX idx_email (email),
                    INDEX idx_expiracion (fecha_expiracion)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `, (error, results) => {
                if (error) {
                    console.error('❌ Error creando tabla:', error.message);
                    reject(error);
                } else {
                    console.log('✅ Tabla verificaciones_pendientes creada');
                    resolve(results);
                }
            });
        });

        // Verificar estructura
        console.log('📊 Verificando estructura de tabla...');
        const [rows] = await new Promise((resolve, reject) => {
            connection.query('DESCRIBE verificaciones_pendientes', (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve([results]);
                }
            });
        });

        console.log('✅ Estructura de verificaciones_pendientes:');
        rows.forEach(field => {
            console.log(`   ${field.Field}: ${field.Type} ${field.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

        console.log('\n🎉 ¡Tabla temporal creada exitosamente!');
        console.log('ℹ️  Los usuarios se guardarán aquí temporalmente hasta verificar email');
        console.log('ℹ️  Tabla usuarios original NO modificada');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        connection.end();
        process.exit(0);
    }
}

crearTablaVerificacion();
