import mysql from 'mysql2/promise';

async function actualizarTablaRecetas(): Promise<void> {
  try {
    // Crear conexión
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '12345',
      database: 'paginaweb'
    });

    console.log('🔗 Conectado a la base de datos');

    // Verificar si las columnas ya existen
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM recetas LIKE 'foto_receta'"
    );

    if ((columns as any[]).length === 0) {
      // Agregar las nuevas columnas
      await connection.execute(`
        ALTER TABLE recetas
        ADD COLUMN foto_receta VARCHAR(255) NULL COMMENT 'Ruta de la imagen de la receta manuscrita',
        ADD COLUMN codigo_medico VARCHAR(50) NULL COMMENT 'Código médico profesional',
        ADD COLUMN firma_digital TEXT NULL COMMENT 'Firma digital del médico para autenticación'
      `);

      console.log('✅ Columnas agregadas exitosamente');

      // Actualizar un registro de prueba
      await connection.execute(`
        UPDATE recetas
        SET codigo_medico = 'MED-12345',
            firma_digital = 'DR_JUAN_PEREZ_2024_12_19_RXTEST123'
        WHERE id = 1
      `);

      console.log('✅ Registro de prueba actualizado');
    } else {
      console.log('ℹ️ Las columnas ya existen');
    }

    // Mostrar estructura actualizada
    const [structure] = await connection.execute('DESCRIBE recetas');
    console.log('📋 Estructura de la tabla recetas:');
    console.table(structure);

    await connection.end();
    console.log('✅ Operación completada');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

actualizarTablaRecetas();
