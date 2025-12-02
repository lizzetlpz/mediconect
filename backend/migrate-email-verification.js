require('dotenv').config();
const mysql = require('mysql2');

async function actualizarBaseDatos() {
    console.log('🔄 Actualizando base de datos para verificación por email...');

    const connection = mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '12345',
        database: process.env.DB_NAME || 'paginaweb'
    });

    try {
        // Agregar columnas para verificación
        console.log('📋 Agregando columnas token_verificacion y token_expiracion...');
        
        await new Promise((resolve, reject) => {
            connection.query(`
                ALTER TABLE usuarios 
                ADD COLUMN token_verificacion VARCHAR(64) NULL,
                ADD COLUMN token_expiracion TIMESTAMP NULL
            `, (error, results) => {
                if (error && !error.message.includes("Duplicate column name")) {
                    console.error('❌ Error agregando columnas:', error.message);
                    reject(error);
                } else {
                    console.log('✅ Columnas agregadas (o ya existían)');
                    resolve(results);
                }
            });
        });

        // Crear índice para tokens
        console.log('🔍 Creando índice para tokens...');
        await new Promise((resolve, reject) => {
            connection.query(`
                CREATE INDEX idx_usuarios_token_verificacion ON usuarios(token_verificacion)
            `, (error, results) => {
                if (error && !error.message.includes("Duplicate key name")) {
                    console.error('❌ Error creando índice:', error.message);
                    reject(error);
                } else {
                    console.log('✅ Índice creado (o ya existía)');
                    resolve(results);
                }
            });
        });

        // Verificar estructura
        console.log('📊 Verificando estructura de tabla usuarios...');
        const [rows] = await new Promise((resolve, reject) => {
            connection.query('DESCRIBE usuarios', (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve([results]);
                }
            });
        });

        console.log('✅ Estructura de tabla usuarios:');
        rows.forEach(field => {
            if (field.Field.includes('token') || field.Field.includes('activo')) {
                console.log(`   ${field.Field}: ${field.Type} ${field.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${field.Default ? `DEFAULT ${field.Default}` : ''}`);
            }
        });

        // Mostrar usuarios existentes
        const [usuarios] = await new Promise((resolve, reject) => {
            connection.query(`
                SELECT usuario_id, nombre, email, activo, token_verificacion, fecha_registro 
                FROM usuarios 
                LIMIT 3
            `, (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve([results]);
                }
            });
        });

        console.log('\n📋 Usuarios existentes (muestra):');
        usuarios.forEach(user => {
            console.log(`   ID: ${user.usuario_id}, Email: ${user.email}, Activo: ${user.activo}, Token: ${user.token_verificacion || 'NULL'}`);
        });

        console.log('\n🎉 ¡Migración completada exitosamente!');
        console.log('ℹ️  Los usuarios existentes mantienen activo = 1');
        console.log('ℹ️  Los nuevos usuarios necesitarán verificación por email');

    } catch (error) {
        console.error('❌ Error en migración:', error);
    } finally {
        connection.end();
        process.exit(0);
    }
}

actualizarBaseDatos();