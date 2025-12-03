// Script para crear las tablas de recetas en MySQL
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function crearTablas() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '12345',
    database: 'paginaweb'
  });

  try {
    console.log('📋 Conectando a la base de datos...');

    // Leer el archivo SQL
    const sqlFile = fs.readFileSync(path.join(__dirname, 'tablas_recetas.sql'), 'utf8');

    // Dividir en comandos individuales (separados por ;)
    const commands = sqlFile.split(';').filter(cmd => cmd.trim().length > 0);

    console.log(`📝 Ejecutando ${commands.length} comandos SQL...`);

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i].trim();
      if (command.length > 0) {
        try {
          await connection.execute(command);
          if (command.toUpperCase().startsWith('CREATE TABLE')) {
            const tableName = command.match(/CREATE TABLE.*?`([^`]+)`/)?.[1];
            console.log(`✅ Tabla creada: ${tableName}`);
          } else if (command.toUpperCase().startsWith('INSERT')) {
            console.log(`📝 Datos insertados`);
          } else if (command.toUpperCase().startsWith('CREATE VIEW')) {
            const viewName = command.match(/CREATE VIEW ([^ ]+)/)?.[1];
            console.log(`👁️ Vista creada: ${viewName}`);
          } else if (command.toUpperCase().startsWith('CREATE INDEX')) {
            const indexName = command.match(/CREATE INDEX ([^ ]+)/)?.[1];
            console.log(`📊 Índice creado: ${indexName}`);
          }
        } catch (error) {
          console.log(`⚠️ Comando omitido (posiblemente ya existe): ${command.substring(0, 50)}...`);
        }
      }
    }

    // Verificar las tablas creadas
    console.log('\n📋 Verificando tablas creadas:');

    const [recetas] = await connection.execute('SELECT COUNT(*) as count FROM recetas');
    console.log(`✅ Tabla 'recetas': ${recetas[0].count} registros`);

    const [medicamentos] = await connection.execute('SELECT COUNT(*) as count FROM receta_medicamentos');
    console.log(`💊 Tabla 'receta_medicamentos': ${medicamentos[0].count} registros`);

    // Mostrar estructura de las tablas
    console.log('\n🗂️ ESTRUCTURA DE TABLA: recetas');
    const [recetasStruct] = await connection.execute('DESCRIBE recetas');
    console.table(recetasStruct.map(col => ({
      Campo: col.Field,
      Tipo: col.Type,
      Null: col.Null,
      Key: col.Key,
      Default: col.Default
    })));

    console.log('\n💊 ESTRUCTURA DE TABLA: receta_medicamentos');
    const [medicamentosStruct] = await connection.execute('DESCRIBE receta_medicamentos');
    console.table(medicamentosStruct.map(col => ({
      Campo: col.Field,
      Tipo: col.Type,
      Null: col.Null,
      Key: col.Key,
      Default: col.Default
    })));

    console.log('\n🎉 ¡Todas las tablas se crearon exitosamente!');

  } catch (error) {
    console.error('❌ Error creando tablas:', error);
  } finally {
    await connection.end();
  }
}

crearTablas();
