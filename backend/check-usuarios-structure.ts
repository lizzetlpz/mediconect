import pool from './BD/SQLite/database';

async function checkUsuariosStructure() {
  try {
    console.log('🔍 Verificando estructura de tabla usuarios...\n');

    // Verificar si la tabla existe
    const [tables]: any = await pool.query(
      "SHOW TABLES LIKE 'usuarios'"
    );
    
    if (tables.length === 0) {
      console.log('❌ La tabla usuarios NO EXISTE');
      return;
    }

    console.log('✅ La tabla usuarios existe\n');

    // Ver estructura completa
    const [structure]: any = await pool.query('DESCRIBE usuarios');
    console.log('📋 ESTRUCTURA DE LA TABLA usuarios:');
    console.table(structure);

    // Ver un registro de ejemplo
    const [example]: any = await pool.query('SELECT * FROM usuarios LIMIT 1');
    console.log('\n📄 EJEMPLO DE REGISTRO:');
    if (example.length > 0) {
      console.log(example[0]);
    } else {
      console.log('(No hay registros)');
    }

    // Verificar columna ID específicamente
    const idColumn = structure.find((col: any) => 
      col.Field === 'id' || col.Field === 'usuario_id'
    );
    
    console.log('\n🔑 COLUMNA DE ID PRIMARIA:');
    console.log(idColumn || '❌ No se encontró columna id ni usuario_id');

    await pool.end();
  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  }
}

checkUsuariosStructure();
