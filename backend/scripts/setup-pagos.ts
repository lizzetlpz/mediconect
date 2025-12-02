import mysql from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';

(async function() {
  try {
    const sqlPath = path.resolve(__dirname, '..', 'BD', 'tabla_pagos.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    const pool = await mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: '12345',
      database: 'paginaweb',
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      multipleStatements: true
    });

    console.log('🔁 Ejecutando script SQL para crear tabla `pagos`...');
    await pool.query(sql);
    console.log('✅ Script ejecutado.');

    console.log('🔁 Insertando fila de prueba en `pagos`...');
    const [result] = await pool.query(
      `INSERT INTO pagos (paciente_id, medico_id, monto, metodo, transaccion, estado, descripcion, fecha)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [1, 1, 150.00, 'tarjeta', 'TXN_TEST_001', 'completado', 'Pago de prueba generado por script', new Date()]
    );
    console.log('✅ InsertId:', (result as any).insertId);

    console.log('🔁 Consultando últimas filas de `pagos`...');
    const [rows] = await pool.query('SELECT * FROM pagos ORDER BY creado_en DESC LIMIT 5');
    console.log(rows);

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error en setup-pagos:', err);
    process.exit(1);
  }
})();
