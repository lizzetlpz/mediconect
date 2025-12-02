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

    console.log('🔎 Verificando existencia de la tabla `pagos`...');
    const [tables] = await pool.query("SHOW TABLES LIKE 'pagos'");
    if (!tables || (Array.isArray(tables) && tables.length === 0)) {
      console.log('❌ La tabla `pagos` no existe.');
      await pool.end();
      process.exit(0);
    }

    const [countRows] = await pool.query('SELECT COUNT(*) as cnt FROM pagos');
    const total = Array.isArray(countRows) && countRows.length ? (countRows as any[])[0].cnt : (countRows as any)['COUNT(*)'];
    console.log('📊 Total de filas en `pagos`:', total);

    const [rows] = await pool.query('SELECT * FROM pagos ORDER BY creado_en DESC LIMIT 5');
    console.log('🧾 Últimas filas (máx 5):');
    console.log(rows);

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error en check-pagos:', err);
    process.exit(1);
  }
})();
