// BD/SQLite/database.ts
import mysql from 'mysql2/promise';

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '12345',
    database: 'paginaweb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

console.log('✅ Pool de conexiones MySQL creado');

// ✅ Sin tipo, deja que TypeScript lo infiera
export function getConnection() {
    return pool;
}

export default pool;
