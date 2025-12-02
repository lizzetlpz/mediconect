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

    console.log('🔎 Verificando existencia de la tabla `citas`...');
    const [tables] = await pool.query("SHOW TABLES LIKE 'citas'");

    if (!tables || (Array.isArray(tables) && tables.length === 0)) {
      console.log('❌ La tabla `citas` no existe en la base de datos `paginaweb`.');
      await pool.end();
      process.exit(0);
    }

    console.log('✅ La tabla `citas` existe. Obteniendo conteo y muestras...');

    const [countRows] = await pool.query('SELECT COUNT(*) as cnt FROM citas');
    const total = Array.isArray(countRows) && countRows.length ? (countRows as any[])[0].cnt : (countRows as any)['COUNT(*)'];
    console.log('📊 Total de filas en `citas`:', total);

    const [rows] = await pool.query('SELECT * FROM citas ORDER BY creado_en DESC LIMIT 5');
    console.log('🧾 Últimas filas (máx 5):');
    console.log(rows);

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error en check-citas:', err);
    process.exit(1);
  }
})();
