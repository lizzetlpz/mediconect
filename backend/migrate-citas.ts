import { getConnection } from './BD/SQLite/database';

async function addCitasColumns() {
  try {
    console.log('🔧 Añadiendo columnas faltantes a la tabla citas...\n');

    const pool = getConnection();

    // Ejecutar los ALTER TABLE
    console.log('📋 Ejecutando: ALTER TABLE citas ADD COLUMN IF NOT EXISTS sintomas VARCHAR(1000)');
    await pool.query('ALTER TABLE citas ADD COLUMN IF NOT EXISTS sintomas VARCHAR(1000)');
    console.log('✅ Columna sintomas añadida/verificada\n');

    console.log('📋 Ejecutando: ALTER TABLE citas ADD COLUMN IF NOT EXISTS notas VARCHAR(1000)');
    await pool.query('ALTER TABLE citas ADD COLUMN IF NOT EXISTS notas VARCHAR(1000)');
    console.log('✅ Columna notas añadida/verificada\n');

    console.log('📋 Ejecutando: ALTER TABLE citas ADD COLUMN IF NOT EXISTS modalidad VARCHAR(50)');
    await pool.query('ALTER TABLE citas ADD COLUMN IF NOT EXISTS modalidad VARCHAR(50)');
    console.log('✅ Columna modalidad añadida/verificada\n');

    // Verificar estructura actual
    console.log('📊 Estructura actual de la tabla citas:\n');
    const [columns]: any = await pool.query('DESCRIBE citas');

    console.log('Columnas:');
    (columns as any[]).forEach((col: any) => {
      console.log(`  - ${col.Field}: ${col.Type}${col.Null === 'NO' ? ' (NOT NULL)' : ' (NULL)'}`);
    });

    await pool.end();
    console.log('\n✅ Migración completada exitosamente.');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addCitasColumns();
