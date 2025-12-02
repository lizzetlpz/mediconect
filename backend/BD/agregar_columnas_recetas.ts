import mysql from 'mysql2/promise';

async function agregarColumnasRecetas() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'paginaweb'
  });

  try {
    console.log('Conectado a la base de datos MySQL');

    // Agregar columna para foto de receta
    try {
      await connection.execute(`
        ALTER TABLE recetas 
        ADD COLUMN foto_receta VARCHAR(255) DEFAULT NULL COMMENT 'Ruta de la foto de la receta manuscrita'
      `);
      console.log('✅ Columna foto_receta agregada exitosamente');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  La columna foto_receta ya existe');
      } else {
        console.error('❌ Error al agregar columna foto_receta:', error.message);
      }
    }

    // Agregar columna para código médico
    try {
      await connection.execute(`
        ALTER TABLE recetas 
        ADD COLUMN codigo_medico VARCHAR(100) DEFAULT NULL COMMENT 'Código de identificación médica'
      `);
      console.log('✅ Columna codigo_medico agregada exitosamente');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  La columna codigo_medico ya existe');
      } else {
        console.error('❌ Error al agregar columna codigo_medico:', error.message);
      }
    }

    // Agregar columna para firma digital
    try {
      await connection.execute(`
        ALTER TABLE recetas 
        ADD COLUMN firma_digital TEXT DEFAULT NULL COMMENT 'Firma digital del médico'
      `);
      console.log('✅ Columna firma_digital agregada exitosamente');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  La columna firma_digital ya existe');
      } else {
        console.error('❌ Error al agregar columna firma_digital:', error.message);
      }
    }

    // Agregar columna para estado de autenticación médica
    try {
      await connection.execute(`
        ALTER TABLE recetas 
        ADD COLUMN autenticacion_medica BOOLEAN DEFAULT FALSE COMMENT 'Indica si la receta tiene autenticación médica válida'
      `);
      console.log('✅ Columna autenticacion_medica agregada exitosamente');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  La columna autenticacion_medica ya existe');
      } else {
        console.error('❌ Error al agregar columna autenticacion_medica:', error.message);
      }
    }

    // Verificar la estructura actualizada de la tabla
    const [rows] = await connection.execute('DESCRIBE recetas');
    console.log('\n📋 Estructura actual de la tabla recetas:');
    console.table(rows);

    console.log('\n🎉 Proceso completado exitosamente');

  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await connection.end();
    console.log('🔌 Conexión cerrada');
  }
}

// Ejecutar el script
agregarColumnasRecetas().catch(console.error);