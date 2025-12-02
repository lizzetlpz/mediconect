import mysql from 'mysql2/promise';

(async function() {
  try {
    const pool = await mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: '12345',
      database: 'paginaweb',
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0
    });

    console.log('🔁 Ejecutando script SQL para crear tabla `familiares`...');
    const sqlPath = require('path').resolve(__dirname, '..', 'BD', 'tabla_familiares.sql');
    const fs = require('fs');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);
    console.log('✅ Script ejecutado.');

    console.log('🔁 Insertando fila de prueba en `familiares`...');
    const [result] = await pool.query(
      `INSERT INTO familiares (owner_id, nombre, apellido_paterno, relacion, fecha_nacimiento, telefono, tipo_sangre, puede_agendar, puede_ver_historial, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [1, 'Prueba', 'Usuario', 'Hijo', '2010-01-01', '555000111', 'O+', 1, 1, 'Registro de prueba automatizado']
    );
    console.log('✅ InsertId:', (result as any).insertId);

    console.log('🔁 Consultando últimas filas de `familiares`...');
    const [rows] = await pool.query('SELECT * FROM familiares ORDER BY creado_en DESC LIMIT 5');
    console.log(rows);

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error en setup-familiares:', err);
    process.exit(1);
  }
})();
