// BD/SQLite/database.ts
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

let dbConfig;

// Usar MYSQL_URL de Railway si está disponible
if (process.env.MYSQL_URL) {
    console.log('🔗 Usando MYSQL_URL de Railway');
    dbConfig = process.env.MYSQL_URL;
} else {
    // Configuración manual para desarrollo local
    dbConfig = {
        host: process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
        user: process.env.MYSQL_USER || process.env.DB_USER || 'root',
        password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '12345',
        database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'paginaweb',
        port: parseInt(process.env.MYSQL_PORT || process.env.DB_PORT || '3306'),
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true
    };
    
    console.log('🔍 Configuración de base de datos local:');
    console.log('   Host:', dbConfig.host);
    console.log('   User:', dbConfig.user);
    console.log('   Database:', dbConfig.database);
    console.log('   Port:', dbConfig.port);
}

const pool = mysql.createPool(dbConfig);

console.log('✅ Pool de conexiones MySQL creado');

// ✅ Sin tipo, deja que TypeScript lo infiera
export function getConnection() {
    return pool;
}

export default pool;
